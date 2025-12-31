import { notFound, parseBucketPath } from "@/utils/bucket";

// 解析用户权限
function parseUserPermissions(env: any, authHeader: string | null): {
  isAdmin: boolean;
  allowedPaths: string[];
} {
  const guestDirs = env.GUEST ? env.GUEST.split(',').map((p: string) => p.trim()).filter(Boolean) : [];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { isAdmin: false, allowedPaths: guestDirs };
  }

  try {
    const base64 = authHeader.split('Basic ')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const account = new TextDecoder().decode(bytes);

    if (!account) {
      return { isAdmin: false, allowedPaths: guestDirs };
    }

    const userPerms = env[account];
    if (!userPerms) {
      return { isAdmin: false, allowedPaths: guestDirs };
    }

    const permissions = userPerms.split(',').map((p: string) => p.trim()).filter(Boolean);
    const isAdmin = permissions.includes('*');

    if (isAdmin) {
      return { isAdmin: true, allowedPaths: [] };
    }

    const allowedPaths = permissions.filter((p: string) =>
      p !== 'readonly' && p.startsWith('/')
    ).map((p: string) => p.replace(/^\//, ''));

    return { isAdmin: false, allowedPaths };
  } catch {
    return { isAdmin: false, allowedPaths: guestDirs };
  }
}

// 检查文件路径是否在允许的范围内
function isFileAllowed(filePath: string, allowedPaths: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true;

  // 缩略图始终允许访问
  if (filePath.startsWith('_$flaredrive$/thumbnails/')) return true;

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
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const pubUrl = context.env["PUBURL"];
  if (!pubUrl) {
    return new Response("PUBURL environment variable is not configured", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // 提取 /raw/ 之后的路径
  const filePath = context.request.url.split("/raw/")[1];
  if (!filePath) {
    return notFound();
  }

  // 权限检查
  const authHeader = context.request.headers.get('Authorization');
  const { isAdmin, allowedPaths } = parseUserPermissions(context.env, authHeader);

  const decodedPath = decodeURIComponent(filePath);
  if (!isFileAllowed(decodedPath, allowedPaths, isAdmin)) {
    return new Response("Access denied", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }

  const url = `${pubUrl}/${filePath}`;

  try {
    const response = await fetch(new Request(url, {
      headers: context.request.headers,
      method: context.request.method,
      redirect: "follow",
    }));

    const headers = new Headers(response.headers);

    // 缩略图设置长期缓存
    if (path.startsWith("_$flaredrive$/thumbnails/")) {
      headers.set("Cache-Control", "max-age=31536000");
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