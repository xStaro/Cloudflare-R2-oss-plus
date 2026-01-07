import { notFound, parseBucketPath } from "@/utils/bucket";
import { decodeBasicAuth, getGuestDirs, INTERNAL_PREFIX, FOLDER_MARKER, extractApiKeyFromHeaders } from "@/utils/auth";

// 解析用户权限（支持 Basic Auth 和 API Key）
async function parseUserPermissions(env: any, headers: Headers): Promise<{
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  allowedPaths: string[];
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
        return { isAuthenticated: true, isAdmin: true, isGuest: false, allowedPaths: [] };
      }

      // 标准化权限路径
      const allowedPaths = result.apiKey.permissions
        .filter((p: string) => p !== '*')
        .map((p: string) => p.replace(/^\//, '').replace(/\/$/, ''));

      return { isAuthenticated: true, isAdmin: false, isGuest: false, allowedPaths };
    }
  }

  // 2. 回退到 Basic Auth
  const authHeader = headers.get('Authorization');
  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      isGuest: true,
      allowedPaths: guestDirs
    };
  }

  const userPerms = env[credentials.account];
  if (!userPerms) {
    return { isAuthenticated: false, isAdmin: false, isGuest: true, allowedPaths: guestDirs };
  }

  const permissions = userPerms.split(',').map((p: string) => p.trim()).filter(Boolean);
  const isAdmin = permissions.includes('*');

  // 管理员可以访问所有路径
  if (isAdmin) {
    return { isAuthenticated: true, isAdmin: true, isGuest: false, allowedPaths: [] };
  }

  // 普通用户 - 提取允许的路径（排除特殊权限标记）
  const allowedPaths = permissions.filter((p: string) =>
    p !== 'readonly' && p.startsWith('/')
  ).map((p: string) => p.replace(/^\//, '')); // 移除开头的斜杠

  return { isAuthenticated: true, isAdmin: false, isGuest: false, allowedPaths };
}

// 检查路径是否在允许的范围内
function isPathAllowed(path: string, allowedPaths: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!allowedPaths || allowedPaths.length === 0) return false;

  const normalizedPath = path.replace(/\/+$/, '');

  for (const allowed of allowedPaths) {
    const normalizedAllowed = allowed.replace(/\/+$/, '');

    // 完全匹配
    if (normalizedPath === normalizedAllowed) return true;

    // 子路径匹配：请求路径是允许路径的子目录
    if (normalizedPath.startsWith(normalizedAllowed + '/')) return true;

    // 父路径匹配：请求路径是允许路径的父目录（需要能看到子目录列表）
    if (normalizedAllowed.startsWith(normalizedPath + '/') || normalizedPath === '') return true;
  }

  return false;
}

// 过滤文件夹列表，只返回用户有权限访问的
function filterFolders(folders: string[], allowedPaths: string[], isAdmin: boolean): string[] {
  if (isAdmin) return folders;
  if (!allowedPaths || allowedPaths.length === 0) return [];

  return folders.filter(folder => {
    const normalizedFolder = folder.replace(/\/+$/, '');

    for (const allowed of allowedPaths) {
      const normalizedAllowed = allowed.replace(/\/+$/, '');

      // 文件夹完全匹配允许路径
      if (normalizedFolder === normalizedAllowed) return true;

      // 文件夹是允许路径的子目录
      if (normalizedFolder.startsWith(normalizedAllowed + '/')) return true;

      // 文件夹是允许路径的父目录
      if (normalizedAllowed.startsWith(normalizedFolder + '/')) return true;
    }

    return false;
  });
}

// 过滤文件列表
function filterFiles(files: any[], currentPath: string, allowedPaths: string[], isAdmin: boolean): any[] {
  if (isAdmin) return files;
  if (!allowedPaths || allowedPaths.length === 0) return [];

  // 如果当前路径在允许范围内，返回所有文件
  for (const allowed of allowedPaths) {
    const normalizedAllowed = allowed.replace(/\/+$/, '');
    const normalizedPath = currentPath.replace(/\/+$/, '');

    if (normalizedPath === normalizedAllowed || normalizedPath.startsWith(normalizedAllowed + '/')) {
      return files;
    }
  }

  return [];
}

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    // 规范化路径：移除末尾斜杠后再添加，确保格式一致
    const normalizedPath = path ? path.replace(/\/+$/, '') : '';
    const prefix = normalizedPath ? `${normalizedPath}/` : '';
    if (!bucket || normalizedPath.startsWith(INTERNAL_PREFIX)) return notFound();

    const url = new URL(context.request.url);
    const marker = url.searchParams.get('marker') || undefined;

    // 权限检查（支持 API Key）
    const headers = new Headers(context.request.headers);
    const { isAdmin, allowedPaths } = await parseUserPermissions(context.env, headers);

    // 检查是否有权限访问当前路径
    if (!isPathAllowed(normalizedPath, allowedPaths, isAdmin)) {
      return new Response(JSON.stringify({ value: [], folders: [], marker: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
      cursor: marker,
    });
    const objKeys = objList.objects
      .filter((obj) => {
        // 过滤掉文件夹标记
        if (obj.key.endsWith(`/${FOLDER_MARKER}`)) return false;
        // 过滤掉以 / 结尾的对象（空文件夹标记）
        if (obj.key.endsWith("/")) return false;
        // 过滤掉 prefix 本身（当前文件夹）
        if (obj.key === prefix) return false;
        return true;
      })
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!normalizedPath)
      folders = folders.filter((folder) => folder !== `${INTERNAL_PREFIX}/`);

    // 根据权限过滤文件夹和文件
    const filteredFolders = filterFolders(folders, allowedPaths, isAdmin);
    const filteredFiles = filterFiles(objKeys, normalizedPath, allowedPaths, isAdmin);

    const nextMarker = objList?.truncated ? (objList?.cursor || null) : null;

    return new Response(
      JSON.stringify({ value: filteredFiles, folders: filteredFolders, marker: nextMarker }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
