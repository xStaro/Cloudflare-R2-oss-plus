import { notFound, parseBucketPath } from "@/utils/bucket";
import { decodeBasicAuth, getGuestDirs, THUMBNAILS_PATH, extractApiKeyFromHeaders } from "@/utils/auth";

// 解析用户权限（支持 Basic Auth 和 API Key）
async function parseUserPermissions(env: any, headers: Headers): Promise<{
  isAdmin: boolean;
  allowedPaths: string[];
  isReadonly: boolean;
}> {
  const guestDirs = getGuestDirs(env);

  // 1. 优先检查 API Key
  const apiKey = extractApiKeyFromHeaders(headers);
  if (apiKey) {
    const { validateApiKey } = await import("@/utils/apikey");
    const result = await validateApiKey(env.ossShares, apiKey);

    if (result.valid && result.apiKey) {
      const isAdmin = result.apiKey.permissions.includes('*');
      if (isAdmin) {
        return { isAdmin: true, allowedPaths: [], isReadonly: result.apiKey.isReadonly };
      }

      // 标准化权限路径
      const allowedPaths = result.apiKey.permissions
        .filter((p: string) => p !== '*')
        .map((p: string) => p.replace(/^\//, '').replace(/\/$/, ''));

      return { isAdmin: false, allowedPaths, isReadonly: result.apiKey.isReadonly };
    }
  }

  // 2. 回退到 Basic Auth
  const authHeader = headers.get('Authorization');
  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return { isAdmin: false, allowedPaths: guestDirs, isReadonly: true };
  }

  const userPerms = env[credentials.account];
  if (!userPerms) {
    return { isAdmin: false, allowedPaths: guestDirs, isReadonly: true };
  }

  const permissions = userPerms.split(',').map((p: string) => p.trim()).filter(Boolean);
  const isAdmin = permissions.includes('*');
  const isReadonly = permissions.includes('readonly');

  if (isAdmin) {
    return { isAdmin: true, allowedPaths: [], isReadonly };
  }

  const allowedPaths = permissions.filter((p: string) =>
    p !== 'readonly' && p.startsWith('/')
  ).map((p: string) => p.replace(/^\//, ''));

  return { isAdmin: false, allowedPaths, isReadonly };
}

// 检查文件路径是否在允许的范围内
function isFileAllowed(filePath: string, allowedPaths: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true;

  // 缩略图始终允许访问
  if (filePath.startsWith(THUMBNAILS_PATH)) return true;

  if (!allowedPaths || allowedPaths.length === 0) return false;

  const normalizedPath = filePath.replace(/\/+$/, '');

  for (const allowed of allowedPaths) {
    const normalizedAllowed = allowed.replace(/\/+$/, '');

    // 文件在允许的目录中
    if (normalizedPath === normalizedAllowed) return true;
    if (normalizedPath.startsWith(normalizedAllowed + '/')) return true;
  }

  return false;
}

export async function onRequestGet(context) {
  let bucket: any;
  let path: string;
  try {
    [bucket, path] = await parseBucketPath(context);
  } catch (error: any) {
    console.error("parseBucketPath error:", error);
    return new Response("Storage config error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
  if (!bucket || !path) return notFound();

  const hasS3Backend = typeof bucket.fetchObject === "function" || bucket?.backend === "s3";

  const pubUrl = context.env["PUBURL"];
  if (!hasS3Backend && !pubUrl) {
    return new Response("PUBURL environment variable is not configured", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // 权限检查（支持 API Key）
  const headers = new Headers(context.request.headers);
  const { isAdmin, allowedPaths } = await parseUserPermissions(context.env, headers);

  if (!isFileAllowed(path, allowedPaths, isAdmin)) {
    return new Response("Access denied", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }

  try {
    let response: Response;

    if (hasS3Backend) {
      const forwardHeaders = new Headers();
      const range = context.request.headers.get("Range");
      if (range) forwardHeaders.set("Range", range);

      response = await bucket.fetchObject(path, {
        method: "GET",
        headers: forwardHeaders,
      });
    } else {
      const encodedKey = path.split("/").map((s: string) => encodeURIComponent(s)).join("/");
      const url = `${String(pubUrl).replace(/\/+$/, "")}/${encodedKey}`;

      const forwardHeaders = new Headers(context.request.headers);
      // 避免把站点登录凭据转发给对象存储源站
      forwardHeaders.delete("Authorization");
      forwardHeaders.delete("Cookie");
      forwardHeaders.delete("X-API-Key");
      forwardHeaders.delete("X-Guest-Password");

      response = await fetch(
        new Request(url, {
          headers: forwardHeaders,
          method: context.request.method,
          redirect: "follow",
          cache: "no-store",
        })
      );
    }

    const headers = new Headers(response.headers);

    // 缩略图设置长期缓存
    if (path.startsWith(THUMBNAILS_PATH)) {
      headers.set("Cache-Control", "max-age=31536000");
    } else {
      // 普通文件避免缓存导致“保存后仍看到旧内容”
      headers.set("Cache-Control", "no-store");
    }

    // 添加 CORS 头
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      headers: headers,
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return new Response(`Failed to fetch from origin: ${error.message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
