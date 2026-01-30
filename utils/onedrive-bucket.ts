type OneDriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId?: string;
  driveId?: string;
  rootPath?: string;
  chunkSize?: number;
};

type OneDriveListResult = {
  objects: Array<{
    key: string;
    size: number;
    uploaded: string;
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  }>;
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
};

const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;
const MIN_CHUNK_SIZE = 320 * 1024;
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;

const tokenCache = new Map<
  string,
  {
    accessToken: string;
    expiresAt: number;
  }
>();

function encodePath(path: string): string {
  return String(path || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizePath(value: string): string {
  return String(value || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function normalizeChunkSize(value?: number): number {
  const raw = Number.isFinite(value) ? Math.max(MIN_CHUNK_SIZE, Number(value)) : DEFAULT_CHUNK_SIZE;
  return Math.floor(raw / MIN_CHUNK_SIZE) * MIN_CHUNK_SIZE || MIN_CHUNK_SIZE;
}

function decodeUploadId(uploadId: string): { uploadUrl: string; totalSize: number; chunkSize: number } {
  try {
    const normalized = String(uploadId || "").replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    const parsed = JSON.parse(json);
    if (!parsed?.uploadUrl) throw new Error("uploadUrl missing");
    return {
      uploadUrl: String(parsed.uploadUrl),
      totalSize: Number(parsed.totalSize) || 0,
      chunkSize: Number(parsed.chunkSize) || DEFAULT_CHUNK_SIZE,
    };
  } catch {
    throw new Error("上传会话已失效，请重试");
  }
}

function encodeUploadId(uploadUrl: string, totalSize: number, chunkSize: number): string {
  const json = JSON.stringify({ uploadUrl, totalSize, chunkSize });
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function readBodySize(body: BodyInit | null): number | null {
  if (!body) return 0;
  if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size;
  return null;
}

async function readStreamFully(stream: ReadableStream): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function ensureOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  let detail = "";
  try {
    detail = await response.text();
  } catch {
    // ignore
  }
  const message = detail ? `${action} 失败：${response.status} ${detail}` : `${action} 失败：${response.status}`;
  const error: any = new Error(message);
  error.status = response.status;
  throw error;
}

async function getAccessToken(config: OneDriveConfig): Promise<string> {
  const cacheKey = `${config.clientId}:${config.tenantId || "common"}:${config.driveId || ""}:${config.refreshToken}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 30_000) {
    return cached.accessToken;
  }

  const tenant = config.tenantId || "common";
  const body = new URLSearchParams();
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("refresh_token", config.refreshToken);
  body.set("grant_type", "refresh_token");

  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OneDrive 认证失败：${response.status} ${detail}`.trim());
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload?.access_token) throw new Error("OneDrive 认证失败：缺少 access_token");
  const expiresAt = Date.now() + Math.max(60, Number(payload.expires_in) || 3600) * 1000;
  tokenCache.set(cacheKey, { accessToken: payload.access_token, expiresAt });
  return payload.access_token;
}

export class OneDriveBucketAdapter {
  public readonly backend = "onedrive";
  private config: OneDriveConfig;
  private rootPath: string;
  private baseUrl: string;

  constructor(config: OneDriveConfig) {
    if (!config?.clientId) throw new Error("OneDrive clientId 未配置");
    if (!config?.clientSecret) throw new Error("OneDrive clientSecret 未配置");
    if (!config?.refreshToken) throw new Error("OneDrive refreshToken 未配置");
    this.config = config;
    this.rootPath = normalizePath(config.rootPath || "");
    const driveId = normalizePath(config.driveId || "");
    this.baseUrl = driveId
      ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}`
      : "https://graph.microsoft.com/v1.0/me/drive";
  }

  private buildItemPath(key: string): string {
    const normalized = normalizePath(key);
    const parts = [this.rootPath, normalized].filter(Boolean);
    return parts.join("/");
  }

  private buildFolderPath(prefix?: string): string {
    const normalized = normalizePath(prefix || "");
    const parts = [this.rootPath, normalized].filter(Boolean);
    return parts.join("/");
  }

  private async graphFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = await getAccessToken(this.config);
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }

  private buildItemUrl(path: string): string {
    const encoded = encodePath(path);
    return encoded ? `${this.baseUrl}/root:/${encoded}` : `${this.baseUrl}/root`;
  }

  private async ensureFolderPath(path: string): Promise<void> {
    const normalized = normalizePath(path);
    if (!normalized) return;
    const segments = normalized.split("/").filter(Boolean);
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const url = this.buildItemUrl(current);
      const response = await this.graphFetch(url, { method: "GET" });
      if (response.status === 404) {
        const parent = current.split("/").slice(0, -1).join("/");
        const parentUrl = parent ? `${this.baseUrl}/root:/${encodePath(parent)}:/children` : `${this.baseUrl}/root/children`;
        const create = await this.graphFetch(parentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: segment,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail",
          }),
        });
        await ensureOk(create, "OneDrive 创建文件夹");
        continue;
      }
      await ensureOk(response, "OneDrive 读取目录");
    }
  }

  public async list(options: {
    prefix?: string;
    delimiter?: string;
    include?: string[];
    cursor?: string;
  }): Promise<OneDriveListResult> {
    let url = "";
    if (options?.cursor && options.cursor.startsWith("https://")) {
      url = options.cursor;
    } else {
      const folderPath = this.buildFolderPath(options?.prefix);
      if (folderPath) {
        url = `${this.baseUrl}/root:/${encodePath(folderPath)}:/children`;
      } else {
        url = `${this.baseUrl}/root/children`;
      }
      const params = new URLSearchParams();
      params.set("$top", "200");
      if (options?.cursor) params.set("$skiptoken", options.cursor);
      url = `${url}?${params}`;
    }

    const response = await this.graphFetch(url, { method: "GET" });
    await ensureOk(response, "OneDrive 列表");
    const data: any = await response.json();
    const items: any[] = Array.isArray(data?.value) ? data.value : [];
    const prefix = options?.prefix || "";
    const objects: OneDriveListResult["objects"] = [];
    const delimitedPrefixes: string[] = [];

    for (const item of items) {
      const entry: any = item;
      const name = String(entry?.name || "");
      if (!name) continue;
      if (entry?.folder) {
        delimitedPrefixes.push(`${prefix}${name}/`);
      } else if (entry?.file) {
        objects.push({
          key: `${prefix}${name}`,
          size: Number(entry?.size) || 0,
          uploaded: entry?.lastModifiedDateTime || new Date().toISOString(),
          httpMetadata: { contentType: entry?.file?.mimeType || undefined },
          customMetadata: {},
        });
      }
    }

    const nextLink = String(data?.["@odata.nextLink"] || "");
    return {
      objects,
      delimitedPrefixes,
      truncated: !!nextLink,
      cursor: nextLink || undefined,
    };
  }

  public async head(key: string): Promise<{
    key: string;
    size: number;
    uploaded: string;
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  } | null> {
    const normalizedKey = normalizePath(key);
    const folderKey = normalizedKey.endsWith("_$folder$") ? normalizedKey.replace(/_\$folder\$$/, "") : normalizedKey;
    const path = this.buildItemPath(folderKey);
    const url = this.buildItemUrl(path);
    const response = await this.graphFetch(url, { method: "GET" });
    if (response.status === 404) return null;
    await ensureOk(response, "OneDrive 获取元数据");
    const item: any = await response.json();
    const isFolder = !!item?.folder || normalizedKey.endsWith("_$folder$");
    return {
      key,
      size: isFolder ? 0 : Number(item?.size) || 0,
      uploaded: item?.lastModifiedDateTime || new Date().toISOString(),
      httpMetadata: isFolder ? undefined : { contentType: item?.file?.mimeType || undefined },
      customMetadata: {},
    };
  }

  public async get(key: string): Promise<{
    body: ReadableStream | null;
    size: number;
    uploaded: string;
    httpMetadata: { contentType?: string };
    customMetadata: Record<string, string>;
  } | null> {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith("_$folder$")) return null;
    const path = this.buildItemPath(normalizedKey);
    const url = `${this.buildItemUrl(path)}:/content`;
    const response = await this.graphFetch(url, { method: "GET" });
    if (response.status === 404) return null;
    await ensureOk(response, "OneDrive 读取文件");
    const size = Number(response.headers.get("content-length") || 0) || 0;
    return {
      body: response.body,
      size,
      uploaded: response.headers.get("last-modified") || new Date().toISOString(),
      httpMetadata: { contentType: response.headers.get("content-type") || undefined },
      customMetadata: {},
    };
  }

  public async fetchObject(key: string, init?: RequestInit): Promise<Response> {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith("_$folder$")) return new Response("Not found", { status: 404 });
    const path = this.buildItemPath(normalizedKey);
    const url = `${this.buildItemUrl(path)}:/content`;
    return this.graphFetch(url, { method: "GET", headers: init?.headers });
  }

  public async delete(key: string): Promise<void> {
    const normalizedKey = normalizePath(key);
    const folderKey = normalizedKey.endsWith("_$folder$") ? normalizedKey.replace(/_\$folder\$$/, "") : normalizedKey;
    const path = this.buildItemPath(folderKey);
    const url = this.buildItemUrl(path);
    const response = await this.graphFetch(url, { method: "DELETE" });
    if (response.status === 404) return;
    await ensureOk(response, "OneDrive 删除");
  }

  public async put(
    key: string,
    body: BodyInit | null,
    options: { customMetadata: Record<string, string>; httpMetadata?: { contentType?: string }; contentLength?: number }
  ): Promise<{ key: string; size: number; uploaded: string }> {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith("_$folder$")) {
      const folderPath = this.buildItemPath(normalizedKey.replace(/_\$folder\$$/, ""));
      await this.ensureFolderPath(folderPath);
      return { key, size: 0, uploaded: new Date().toISOString() };
    }

    const path = this.buildItemPath(normalizedKey);
    const parentPath = path.split("/").slice(0, -1).join("/");
    await this.ensureFolderPath(parentPath);

    const contentLength = options?.contentLength ?? readBodySize(body);
    const contentType = options?.httpMetadata?.contentType || "application/octet-stream";

    if (contentLength !== null && contentLength <= SIMPLE_UPLOAD_LIMIT) {
      const url = `${this.buildItemUrl(path)}:/content`;
      const response = await this.graphFetch(url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });
      await ensureOk(response, "OneDrive 上传");
      return { key, size: contentLength, uploaded: new Date().toISOString() };
    }

    const uploadSessionUrl = `${this.buildItemUrl(path)}:/createUploadSession`;
    const sessionResponse = await this.graphFetch(uploadSessionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
          name: normalizedKey.split("/").pop() || "",
        },
      }),
    });
    await ensureOk(sessionResponse, "OneDrive 初始化上传会话");
    const session: any = await sessionResponse.json();
    const uploadUrl = session?.uploadUrl;
    if (!uploadUrl) throw new Error("OneDrive 上传会话创建失败");

    let payload: Uint8Array | null = null;
    if (body && body instanceof ReadableStream) {
      payload = await readStreamFully(body);
    } else if (body instanceof ArrayBuffer) {
      payload = new Uint8Array(body);
    } else if (ArrayBuffer.isView(body)) {
      payload = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof Blob !== "undefined" && body instanceof Blob) {
      payload = new Uint8Array(await body.arrayBuffer());
    } else if (typeof body === "string") {
      payload = new TextEncoder().encode(body);
    }

    const totalSize = contentLength ?? payload?.byteLength ?? 0;
    const chunkSize = normalizeChunkSize(this.config.chunkSize);
    if (!payload) payload = new Uint8Array(0);

    let offset = 0;
    while (offset < payload.byteLength) {
      const end = Math.min(offset + chunkSize, payload.byteLength) - 1;
      const chunk = payload.slice(offset, end + 1);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${offset}-${end}/${totalSize}`,
          "Content-Type": contentType,
        },
        body: chunk,
      });
      await ensureOk(uploadResponse, "OneDrive 分片上传");
      offset = end + 1;
    }

    return { key, size: totalSize, uploaded: new Date().toISOString() };
  }

  public async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    const source = await this.get(sourceKey);
    if (!source) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    await this.put(targetKey, source.body, {
      customMetadata: {},
      httpMetadata: source.httpMetadata,
      contentLength: source.size,
    });
  }

  public async createMultipartUpload(
    key: string,
    options: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string>; contentLength?: number; chunkSize?: number }
  ): Promise<{ key: string; uploadId: string }> {
    const normalizedKey = normalizePath(key);
    if (normalizedKey.endsWith("_$folder$")) {
      await this.put(key, "", { customMetadata: {}, httpMetadata: options?.httpMetadata, contentLength: 0 });
      return { key, uploadId: "" };
    }

    const path = this.buildItemPath(normalizedKey);
    const parentPath = path.split("/").slice(0, -1).join("/");
    await this.ensureFolderPath(parentPath);

    const uploadSessionUrl = `${this.buildItemUrl(path)}:/createUploadSession`;
    const sessionResponse = await this.graphFetch(uploadSessionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
          name: normalizedKey.split("/").pop() || "",
        },
      }),
    });
    await ensureOk(sessionResponse, "OneDrive 初始化上传会话");
    const session: any = await sessionResponse.json();
    const uploadUrl = session?.uploadUrl;
    if (!uploadUrl) throw new Error("OneDrive 上传会话创建失败");

    const chunkSize = normalizeChunkSize(options?.chunkSize ?? this.config.chunkSize);
    const totalSize = Number(options?.contentLength) || 0;
    if (!Number.isFinite(totalSize) || totalSize <= 0) {
      throw new Error("OneDrive 分片上传需要提供文件大小");
    }
    return { key, uploadId: encodeUploadId(uploadUrl, totalSize, chunkSize) };
  }

  public async resumeMultipartUpload(key: string, uploadId: string) {
    return new OneDriveMultipartUpload(this, key, uploadId);
  }

  public async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: ReadableStream | null
  ): Promise<{ etag: string }>{
    const { uploadUrl, totalSize, chunkSize } = decodeUploadId(uploadId);
    if (!Number.isFinite(totalSize) || totalSize <= 0) {
      throw new Error("OneDrive 上传会话信息无效");
    }
    const payload = body ? await readStreamFully(body) : new Uint8Array(0);
    if (payload.byteLength <= 0) {
      throw new Error("OneDrive 分片为空");
    }
    const start = (partNumber - 1) * chunkSize;
    const end = Math.min(start + payload.byteLength - 1, totalSize - 1);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(payload.byteLength),
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      },
      body: payload,
    });
    await ensureOk(response, "OneDrive 上传分片");
    const etag = response.headers.get("ETag") || response.headers.get("etag") || "";
    return { etag };
  }

  public async completeMultipartUpload(key: string, uploadId: string, parts: Array<{ partNumber: number; etag: string }>) {
    return { httpEtag: parts?.[parts.length - 1]?.etag || "" };
  }
}

class OneDriveMultipartUpload {
  private bucket: OneDriveBucketAdapter;
  private key: string;
  private uploadId: string;

  constructor(bucket: OneDriveBucketAdapter, key: string, uploadId: string) {
    this.bucket = bucket;
    this.key = key;
    this.uploadId = uploadId;
  }

  async uploadPart(partNumber: number, body: ReadableStream | null) {
    return this.bucket.uploadPart(this.key, this.uploadId, partNumber, body);
  }

  async complete(parts: Array<{ partNumber: number; etag: string }>) {
    return this.bucket.completeMultipartUpload(this.key, this.uploadId, parts);
  }
}
