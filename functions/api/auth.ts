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
  guestDirs?: string[];
}

// 解析用户权限
function parseUserPermissions(env: Env, username: string, password: string): { valid: boolean; permissions: string[]; isAdmin: boolean } {
  const account = `${username}:${password}`;
  const permStr = env[account];

  if (!permStr) {
    return { valid: false, permissions: [], isAdmin: false };
  }

  const permissions = permStr.split(',').map((p: string) => p.trim()).filter(Boolean);
  const isAdmin = permissions.includes('*');

  return { valid: true, permissions, isAdmin };
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
    const decoded = atob(base64);
    const [username, password] = decoded.split(':');

    if (!username || !password) {
      return Response.json(response);
    }

    const { valid, permissions, isAdmin } = parseUserPermissions(env, username, password);

    if (valid) {
      response.authenticated = true;
      response.username = username;
      response.permissions = permissions;
      response.isAdmin = isAdmin;
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

    const { valid, permissions, isAdmin } = parseUserPermissions(env, username, password);

    if (!valid) {
      return Response.json({
        success: false,
        error: '用户名或密码错误',
      }, { status: 401 });
    }

    // 返回认证凭据（base64编码）供前端存储
    const credentials = btoa(`${username}:${password}`);

    return Response.json({
      success: true,
      username,
      permissions,
      isAdmin,
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
