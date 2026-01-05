// ==================== 常量定义 ====================
export const INTERNAL_PREFIX = '_$flaredrive$';
export const FOLDER_MARKER = '_$folder$';
export const THUMBNAILS_PATH = `${INTERNAL_PREFIX}/thumbnails/`;

// ==================== 类型定义 ====================
export interface UserPermissions {
  valid: boolean;
  permissions: string[];
  isAdmin: boolean;
  isReadonly: boolean;
}

export interface DecodedCredentials {
  username: string;
  password: string;
  account: string;
}

// ==================== 工具函数 ====================

/**
 * 解码 Base64 认证头，正确处理 Unicode 字符
 */
export function decodeBasicAuth(authHeader: string): DecodedCredentials | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64 = authHeader.split('Basic ')[1];
    if (!base64) return null;

    // 使用 TextDecoder 处理 Unicode 字符
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);

    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;

    const username = decoded.substring(0, colonIndex);
    const password = decoded.substring(colonIndex + 1);

    if (!username) return null;

    return {
      username,
      password,
      account: decoded
    };
  } catch {
    return null;
  }
}

/**
 * 编码凭据为 Base64，正确处理 Unicode 字符
 */
export function encodeBasicAuth(username: string, password: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${username}:${password}`);
  return btoa(String.fromCharCode(...data));
}

/**
 * 解析用户权限
 */
export function parseUserPermissions(env: Record<string, any>, username: string, password: string): UserPermissions {
  const account = `${username}:${password}`;
  const permStr = env[account];

  if (!permStr) {
    return { valid: false, permissions: [], isAdmin: false, isReadonly: false };
  }

  const permissions = permStr.split(',').map((p: string) => p.trim()).filter(Boolean);
  const isAdmin = permissions.includes('*');
  const isReadonly = permissions.includes('readonly');

  return { valid: true, permissions, isAdmin, isReadonly };
}

/**
 * 获取访客可访问目录
 */
export function getGuestDirs(env: Record<string, any>): string[] {
  if (!env.GUEST) return [];
  return env.GUEST.split(',').map((p: string) => p.trim()).filter(Boolean);
}

/**
 * 检查路径是否匹配权限
 */
export function checkPathPermission(path: string, permissions: string[]): boolean {
  for (const perm of permissions) {
    const trimmed = perm.trim();
    if (trimmed === '*') {
      return true;
    }
    if (trimmed === 'readonly') {
      continue;
    }
    // 移除开头的 / 进行比较
    const normalizedPerm = trimmed.replace(/^\//, '');
    if (path.startsWith(normalizedPerm)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查写入权限（用于上传、删除等操作）
 */
export function getWriteAuthStatus(context: any): boolean {
  const url = context.request.url;
  const pathParts = url.split("/api/write/items/");
  const dopath = pathParts.length > 1 ? pathParts[1] : null;

  if (!dopath) return false;

  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');

  // 如果有登录凭据，验证用户权限
  if (authHeader) {
    const credentials = decodeBasicAuth(authHeader);
    if (!credentials) return false;

    const permStr = context.env[credentials.account];
    if (!permStr) return false;

    // 缩略图始终允许
    if (dopath.startsWith(THUMBNAILS_PATH)) return true;

    const permissions = permStr.split(",").map((p: string) => p.trim());
    return checkPathPermission(dopath, permissions);
  }

  // 访客模式 - 需要验证上传密码
  if (context.env["GUEST"]) {
    // 缩略图始终允许
    if (dopath.startsWith(THUMBNAILS_PATH)) return true;

    // 检查访客上传密码
    const guestUploadPassword = context.env["GUEST_UPLOAD_PASSWORD"];
    if (guestUploadPassword) {
      const providedPassword = headers.get('X-Guest-Password');
      if (providedPassword !== guestUploadPassword) {
        return false;
      }
    }

    // 验证访客可写目录
    const guestDirs = getGuestDirs(context.env);
    for (const dir of guestDirs) {
      if (dir === '*' || dopath.startsWith(dir)) {
        return true;
      }
    }
  }

  return false;
}

// 兼容旧的函数名
export const get_auth_status = getWriteAuthStatus;

/**
 * 检查是否为管理员（用于管理工具等）
 */
export function isAdminUser(context: any): boolean {
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');

  if (!authHeader) return false;

  const credentials = decodeBasicAuth(authHeader);
  if (!credentials) return false;

  const permStr = context.env[credentials.account];
  if (!permStr) return false;

  const permissions = permStr.split(',').map((p: string) => p.trim());
  return permissions.includes('*');
}
