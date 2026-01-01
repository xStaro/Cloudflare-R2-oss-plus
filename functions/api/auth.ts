import {
  decodeBasicAuth,
  encodeBasicAuth,
  parseUserPermissions,
  getGuestDirs
} from "@/utils/auth";

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

// GET /api/auth - 检查当前认证状态
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const authHeader = request.headers.get('Authorization');

  const response: AuthResponse = {
    authenticated: false,
    guestDirs: getGuestDirs(env),
  };

  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return Response.json(response);
  }

  const { valid, permissions, isAdmin, isReadonly } = parseUserPermissions(
    env,
    credentials.username,
    credentials.password
  );

  if (valid) {
    response.authenticated = true;
    response.username = credentials.username;
    response.permissions = permissions;
    response.isAdmin = isAdmin;
    response.isReadonly = isReadonly;
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
    const credentials = encodeBasicAuth(username, password);

    return Response.json({
      success: true,
      username,
      permissions,
      isAdmin,
      isReadonly,
      credentials,
      guestDirs: getGuestDirs(env),
    });
  } catch {
    return Response.json({
      success: false,
      error: '请求格式错误',
    }, { status: 400 });
  }
};
