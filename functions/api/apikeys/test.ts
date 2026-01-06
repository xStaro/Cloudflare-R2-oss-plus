import {
  extractApiKeyFromHeaders,
  validateApiKey,
} from "@/utils/apikey";

interface Env {
  ossShares: KVNamespace;
  [key: string]: any;
}

// GET - 测试 API Key 有效性
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const headers = new Headers(context.request.headers);
  const apiKey = extractApiKeyFromHeaders(headers);

  if (!apiKey) {
    return new Response(JSON.stringify({
      valid: false,
      error: '未提供 API Key',
      usage: '请在请求头中提供 API Key: Authorization: Bearer sk-xxx 或 X-API-Key: sk-xxx'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await validateApiKey(context.env.ossShares, apiKey);

    if (!result.valid) {
      return new Response(JSON.stringify({
        valid: false,
        error: result.error || 'API Key 无效'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const key = result.apiKey!;
    const isAdmin = key.permissions.includes('*');

    return new Response(JSON.stringify({
      valid: true,
      apiKey: {
        id: key.id,
        name: key.name,
        permissions: key.permissions,
        isAdmin,
        isReadonly: key.isReadonly,
        expiresAt: key.expiresAt,
        createdBy: key.createdBy,
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Test API Key error:', error);
    return new Response(JSON.stringify({
      valid: false,
      error: '验证 API Key 时发生错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
