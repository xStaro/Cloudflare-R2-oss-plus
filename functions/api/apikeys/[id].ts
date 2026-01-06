import { decodeBasicAuth } from "@/utils/auth";
import {
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  extractApiKeyFromHeaders,
  authenticateWithApiKey,
} from "@/utils/apikey";

interface Env {
  ossShares: KVNamespace;
  [key: string]: any;
}

/**
 * 检查是否为管理员（支持 Basic Auth 和 API Key）
 */
async function checkAdminAuth(context: any): Promise<{ isAdmin: boolean; username: string }> {
  const headers = new Headers(context.request.headers);

  // 1. 尝试 API Key 认证
  const apiKey = extractApiKeyFromHeaders(headers);
  if (apiKey) {
    const result = await authenticateWithApiKey(context.env.ossShares, apiKey);
    if (result.authenticated && result.isAdmin) {
      return { isAdmin: true, username: result.username || '' };
    }
    return { isAdmin: false, username: '' };
  }

  // 2. 回退到 Basic Auth
  const authHeader = headers.get('Authorization');
  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return { isAdmin: false, username: '' };
  }

  const userPerms = context.env[credentials.account];
  if (!userPerms) {
    return { isAdmin: false, username: '' };
  }

  const permissions = userPerms.split(',').map((p: string) => p.trim());
  const isAdmin = permissions.includes('*');

  return { isAdmin, username: credentials.username };
}

// GET - 获取单个 API Key 详情（仅管理员）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { isAdmin } = await checkAdminAuth(context);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: '需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = context.params.id as string;

  try {
    const apiKey = await getApiKeyById(context.env.ossShares, id);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key 不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回时隐藏完整密钥
    return new Response(JSON.stringify({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPreview: apiKey.key.substring(0, 7) + '...' + apiKey.key.substring(apiKey.key.length - 4),
        permissions: apiKey.permissions,
        isReadonly: apiKey.isReadonly,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        lastUsed: apiKey.lastUsed,
        createdBy: apiKey.createdBy,
        enabled: apiKey.enabled,
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get API Key error:', error);
    return new Response(JSON.stringify({ error: '获取 API Key 失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - 更新 API Key（仅管理员）
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { isAdmin } = await checkAdminAuth(context);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: '需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = context.params.id as string;

  try {
    const body = await context.request.json() as {
      name?: string;
      permissions?: string[];
      isReadonly?: boolean;
      expiresAt?: number | null;
      enabled?: boolean;
    };

    // 检查 API Key 是否存在
    const existingKey = await getApiKeyById(context.env.ossShares, id);
    if (!existingKey) {
      return new Response(JSON.stringify({ error: 'API Key 不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 构建更新对象
    const updates: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return new Response(JSON.stringify({ error: '名称不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      updates.name = body.name.trim();
    }

    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
        return new Response(JSON.stringify({ error: '权限不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      updates.permissions = body.permissions;
    }

    if (body.isReadonly !== undefined) {
      updates.isReadonly = !!body.isReadonly;
    }

    if (body.expiresAt !== undefined) {
      updates.expiresAt = body.expiresAt;
    }

    if (body.enabled !== undefined) {
      updates.enabled = !!body.enabled;
    }

    // 执行更新
    const updatedKey = await updateApiKey(context.env.ossShares, id, updates);

    if (!updatedKey) {
      return new Response(JSON.stringify({ error: '更新失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      apiKey: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPreview: updatedKey.key.substring(0, 7) + '...' + updatedKey.key.substring(updatedKey.key.length - 4),
        permissions: updatedKey.permissions,
        isReadonly: updatedKey.isReadonly,
        createdAt: updatedKey.createdAt,
        expiresAt: updatedKey.expiresAt,
        lastUsed: updatedKey.lastUsed,
        createdBy: updatedKey.createdBy,
        enabled: updatedKey.enabled,
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update API Key error:', error);
    return new Response(JSON.stringify({ error: '更新 API Key 失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - 删除 API Key（仅管理员）
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { isAdmin } = await checkAdminAuth(context);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: '需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = context.params.id as string;

  try {
    const deleted = await deleteApiKey(context.env.ossShares, id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'API Key 不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete API Key error:', error);
    return new Response(JSON.stringify({ error: '删除 API Key 失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
