import { S3Client } from "@/utils/s3";

function encodePathForS3(key: string): string {
  return String(key || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeXmlEntities(value: string): string {
  return String(value || "").replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (m, token: string) => {
      switch (token) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
      }
      if (token.startsWith("#x")) {
        const codePoint = Number.parseInt(token.slice(2), 16);
        if (Number.isFinite(codePoint)) return String.fromCodePoint(codePoint);
        return m;
      }
      if (token.startsWith("#")) {
        const codePoint = Number.parseInt(token.slice(1), 10);
        if (Number.isFinite(codePoint)) return String.fromCodePoint(codePoint);
        return m;
      }
      return m;
    }
  );
}

function extractTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(xml || "").match(regex);
  if (!match) return null;
  return decodeXmlEntities(match[1]);
}

async function throwIfNotOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  let detail = "";
  try {
    detail = await response.text();
  } catch {
    // ignore
  }
  const msg = detail ? `${action} 失败：${response.status} ${detail}` : `${action} 失败：${response.status}`;
  const err: any = new Error(msg);
  // 兼容部分 S3 实现：NoSuchKey 可能以 400 返回
  if (response.status === 400 && /NoSuchKey/i.test(detail)) {
    err.status = 404;
  } else {
    err.status = response.status;
  }
  throw err;
}

export type S3ListResult = {
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

export class S3BucketAdapter {
  private client: S3Client;
  private endpoint: URL;
  private bucket: string;
  private forcePathStyle: boolean;
  public readonly backend = "s3";

  constructor(options: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
    forcePathStyle?: boolean;
  }) {
    if (!options?.endpoint) throw new Error("S3_ENDPOINT 未配置");
    if (!options?.bucket) throw new Error("S3_BUCKET 未配置");
    if (!options?.accessKeyId) throw new Error("S3 accessKeyId 未配置");
    if (!options?.secretAccessKey) throw new Error("S3 secretAccessKey 未配置");

    this.endpoint = new URL(options.endpoint);
    this.bucket = options.bucket;
    this.forcePathStyle = options.forcePathStyle !== false;
    this.client = new S3Client(options.accessKeyId, options.secretAccessKey, options.region);
  }

  private buildUrl(key?: string, searchParams?: URLSearchParams): string {
    const url = new URL(this.endpoint.toString());
    const encodedKey = key ? encodePathForS3(key) : "";
    const basePath = url.pathname.replace(/\/+$/, "");

    if (this.forcePathStyle) {
      const bucketPath = basePath ? `${basePath}/${this.bucket}` : `/${this.bucket}`;
      url.pathname = `${bucketPath}${encodedKey ? `/${encodedKey}` : ""}`;
    } else {
      const bucketPrefix = `${this.bucket}.`.toLowerCase();
      if (!url.hostname.toLowerCase().startsWith(bucketPrefix)) {
        url.hostname = `${this.bucket}.${url.hostname}`;
      }
      url.pathname = `${basePath}${encodedKey ? `/${encodedKey}` : ""}` || "/";
    }
    url.search = searchParams ? searchParams.toString() : "";
    return url.toString();
  }

  public fetchObject(key: string, init?: RequestInit): Promise<Response> {
    return this.client.s3_fetch(this.buildUrl(key), init);
  }

  // 兼容 R2Bucket.list 形状：支持 cursor（前端用 marker 透传）
  public async list(options: {
    prefix?: string;
    delimiter?: string;
    include?: string[];
    cursor?: string;
  }): Promise<S3ListResult> {
    const search = new URLSearchParams();
    search.set("list-type", "2");
    if (options?.prefix) search.set("prefix", options.prefix);
    if (options?.delimiter) search.set("delimiter", options.delimiter);
    if (options?.cursor) search.set("continuation-token", options.cursor);

    const response = await this.client.s3_fetch(this.buildUrl(undefined, search), {
      method: "GET",
    });
    await throwIfNotOk(response, "S3 列表");

    const text = await response.text();
    const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(text);
    const cursor = truncated ? extractTagValue(text, "NextContinuationToken") || undefined : undefined;

    const delimitedPrefixes = [...text.matchAll(/<CommonPrefixes>[\s\S]*?<Prefix>([\s\S]*?)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/gi)]
      .map((m) => decodeXmlEntities(m[1]).trim())
      .filter(Boolean);

    const objects = [...text.matchAll(/<Contents>([\s\S]*?)<\/Contents>/gi)]
      .map((m) => m[1])
      .map((block) => {
        const key = extractTagValue(block, "Key") || "";
        const size = Number.parseInt(extractTagValue(block, "Size") || "0", 10) || 0;
        const lastModified = extractTagValue(block, "LastModified") || new Date().toISOString();
        return { key, size, uploaded: lastModified };
      })
      .filter((obj) => obj.key);

    return {
      objects,
      delimitedPrefixes,
      truncated,
      cursor,
    };
  }

  public async head(key: string): Promise<{
    key: string;
    size: number;
    uploaded: string;
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  } | null> {
    const response = await this.client.s3_fetch(this.buildUrl(key), { method: "HEAD" });
    if (!response.ok) {
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      if (response.status === 404 || /NoSuchKey/i.test(detail)) return null;
      const err: any = new Error(`S3 HeadObject 失败：${response.status} ${detail}`.trim());
      err.status = response.status;
      throw err;
    }

    const httpMetadata = { contentType: response.headers.get("content-type") || undefined };
    const customMetadata: Record<string, string> = {};
    const thumbnail = response.headers.get("x-amz-meta-thumbnail");
    if (thumbnail) customMetadata.thumbnail = thumbnail;

    const size = Number.parseInt(response.headers.get("content-length") || "0", 10) || 0;
    const uploaded = response.headers.get("last-modified") || new Date().toISOString();

    return {
      key,
      size,
      uploaded,
      httpMetadata,
      customMetadata,
    };
  }

  public async get(key: string): Promise<{
    body: ReadableStream | null;
    size: number;
    uploaded: string;
    httpMetadata: { contentType?: string };
    customMetadata: Record<string, string>;
  } | null> {
    const response = await this.client.s3_fetch(this.buildUrl(key), { method: "GET" });
    if (!response.ok) {
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      if (response.status === 404 || /NoSuchKey/i.test(detail)) return null;
      const err: any = new Error(`S3 读取对象失败：${response.status} ${detail}`.trim());
      err.status = response.status;
      throw err;
    }

    const httpMetadata = { contentType: response.headers.get("content-type") || undefined };
    const customMetadata: Record<string, string> = {};
    const thumbnail = response.headers.get("x-amz-meta-thumbnail");
    if (thumbnail) customMetadata.thumbnail = thumbnail;

    const size = Number.parseInt(response.headers.get("content-length") || "0", 10) || 0;
    const uploaded = response.headers.get("last-modified") || new Date().toISOString();

    return {
      body: response.body,
      size,
      uploaded,
      httpMetadata,
      customMetadata,
    };
  }

  public async delete(key: string): Promise<void> {
    const response = await this.client.s3_fetch(this.buildUrl(key), { method: "DELETE" });
    await throwIfNotOk(response, "S3 删除对象");
  }

  public async put(
    key: string,
    body: BodyInit | null,
    options: { customMetadata: Record<string, string>; httpMetadata?: { contentType?: string } }
  ): Promise<{ key: string; size: number; uploaded: string }> {
    const headers = new Headers();
    const contentType = options?.httpMetadata?.contentType;
    if (contentType) headers.set("content-type", contentType);

    const customMetadata = options?.customMetadata || {};
    for (const [k, v] of Object.entries(customMetadata)) {
      if (v === undefined || v === null || v === "") continue;
      headers.set(`x-amz-meta-${k}`, String(v));
    }

    const response = await this.client.s3_fetch(this.buildUrl(key), {
      method: "PUT",
      headers,
      body,
    });
    await throwIfNotOk(response, "S3 写入对象");

    return {
      key,
      size: 0,
      uploaded: new Date().toISOString(),
    };
  }

  public async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    const headers = new Headers();
    // S3 要求以 /{bucket}/{key} 作为 copy source，并对 key 做 URL 编码（保留 /）
    headers.set("x-amz-copy-source", `/${this.bucket}/${encodePathForS3(sourceKey)}`);
    const response = await this.client.s3_fetch(this.buildUrl(targetKey), {
      method: "PUT",
      headers,
    });
    await throwIfNotOk(response, "S3 复制对象");
  }

  public async createMultipartUpload(
    key: string,
    options: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ): Promise<{ key: string; uploadId: string }> {
    const headers = new Headers();
    const contentType = options?.httpMetadata?.contentType;
    if (contentType) headers.set("content-type", contentType);

    const customMetadata = options?.customMetadata || {};
    for (const [k, v] of Object.entries(customMetadata)) {
      if (v === undefined || v === null || v === "") continue;
      headers.set(`x-amz-meta-${k}`, String(v));
    }

    const search = new URLSearchParams();
    search.set("uploads", "");

    const response = await this.client.s3_fetch(this.buildUrl(key, search), {
      method: "POST",
      headers,
    });
    await throwIfNotOk(response, "S3 初始化分片上传");

    const text = await response.text();
    const uploadId = extractTagValue(text, "UploadId");
    if (!uploadId) throw new Error(`S3 初始化分片上传失败：缺少 UploadId`);

    return { key, uploadId };
  }

  public async resumeMultipartUpload(key: string, uploadId: string) {
    return new S3MultipartUpload(this, key, uploadId);
  }

  async uploadPart(key: string, uploadId: string, partNumber: number, body: ReadableStream | null) {
    const search = new URLSearchParams();
    search.set("partNumber", String(partNumber));
    search.set("uploadId", uploadId);

    const response = await this.client.s3_fetch(this.buildUrl(key, search), {
      method: "PUT",
      body,
    });
    await throwIfNotOk(response, "S3 上传分片");

    const etag = response.headers.get("etag") || "";
    return { etag };
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: Array<{ partNumber: number; etag: string }>) {
    const search = new URLSearchParams();
    search.set("uploadId", uploadId);

    const escapeXml = (s: string) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n${parts
      .map(
        (p) =>
          `  <Part><PartNumber>${p.partNumber}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`
      )
      .join("\n")}\n</CompleteMultipartUpload>`;

    const headers = new Headers({ "content-type": "application/xml" });
    const response = await this.client.s3_fetch(this.buildUrl(key, search), {
      method: "POST",
      headers,
      body,
    });
    await throwIfNotOk(response, "S3 完成分片上传");

    const text = await response.text();
    const httpEtag = extractTagValue(text, "ETag") || "";
    return { httpEtag };
  }
}

class S3MultipartUpload {
  private bucket: S3BucketAdapter;
  private key: string;
  private uploadId: string;

  constructor(bucket: S3BucketAdapter, key: string, uploadId: string) {
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
