interface Env {
  BUCKET: R2Bucket;
  GUEST?: string;
  [key: string]: any;
}

interface AuthResponse {
  authenticated: boolean;
  username?: string;
  permissions?: string[];
  isAdmin?: boolean;
  isReadonly?: boolean;
  guestDirs?: string[];
}

// 解析用户权限
function parseUserPermissions(env: Env, username: string, password: string): { valid: boolean; permissions: string[]; isAdmin: boolean; isReadonly: boolean } {
  const account = `${username}:${password}`;
  const permStr = env[account];

  if (!permStr) {
    return { valid: false, permissions: [], isAdmin: false, isReadonly: false };
  }

  const permissions = permStr.split(',').map((p: string) => p.trim()).filter(Boolean);
  const isAdmin = permissions.includes('*');
  // readonly 用户只能查看和下载，不能上传、删除、分享等
  const isReadonly = permissions.includes('readonly');

  return { valid: true, permissions, isAdmin, isReadonly };
}

// 获取访客可写目录
function getGuestDirs(env: Env): string[] {
  if (!env.GUEST) return [];
  return env.GUEST.split(',').map((p: string) => p.trim()).filter(Boolean);
}

// GET /api/auth - 检查当前认证状态
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const authHeader = request.headers.get('Authorization');

  const response: AuthResponse = {
    authenticated: false,
    guestDirs: getGuestDirs(env),
  };

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return Response.json(response);
  }

  try {
    const base64 = authHeader.split('Basic ')[1];
    // 使用 TextDecoder 处理 Unicode 字符
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    const colonIndex = decoded.indexOf(':');
    const username = decoded.substring(0, colonIndex);
    const password = decoded.substring(colonIndex + 1);

    if (!username || !password) {
      return Response.json(response);
    }

    const { valid, permissions, isAdmin, isReadonly } = parseUserPermissions(env, username, password);

    if (valid) {
      response.authenticated = true;
      response.username = username;
      response.permissions = permissions;
      response.isAdmin = isAdmin;
      response.isReadonly = isReadonly;
    }
  } catch (e) {
    // Invalid base64 or other error
  }

  return Response.json(response);
};

// POST /api/auth - 登录验证
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return Response.json({
        success: false,
        error: '请输入用户名和密码',
      }, { status: 400 });
    }

    const { valid, permissions, isAdmin, isReadonly } = parseUserPermissions(env, username, password);

    if (!valid) {
      return Response.json({
        success: false,
        error: '用户名或密码错误',
      }, { status: 401 });
    }

    // 返回认证凭据（base64编码）供前端存储
    // 使用 TextEncoder 处理 Unicode 字符
    const encoder = new TextEncoder();
    const data = encoder.encode(`${username}:${password}`);
    const credentials = btoa(String.fromCharCode(...data));

    return Response.json({
      success: true,
      username,
      permissions,
      isAdmin,
      isReadonly,
      credentials,
      guestDirs: getGuestDirs(env),
    });
  } catch (e) {
    return Response.json({
      success: false,
      error: '请求格式错误',
    }, { status: 400 });
  }
};
