import { checkAdminAuth } from "@/utils/auth";
import { getAllApiKeys, createApiKey } from "@/utils/apikey";

interface Env {
  ossShares: KVNamespace;
  [key: string]: any;
}

// GET - 获取 API Key 列表（仅管理员）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { isAdmin, username } = await checkAdminAuth(context);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: '需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiKeys = await getAllApiKeys(context.env.ossShares);

    // 返回时隐藏完整密钥，只显示部分
    const safeKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPreview: key.key.substring(0, 7) + '...' + key.key.substring(key.key.length - 4),
      permissions: key.permissions,
      isReadonly: key.isReadonly,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsed: key.lastUsed,
      createdBy: key.createdBy,
      enabled: key.enabled,
    }));

    // 按创建时间倒序排列
    safeKeys.sort((a, b) => b.createdAt - a.createdAt);

    return new Response(JSON.stringify({ apiKeys: safeKeys }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List API Keys error:', error);
    return new Response(JSON.stringify({ error: '获取 API Key 列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - 创建新的 API Key（仅管理员）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { isAdmin, username } = await checkAdminAuth(context);

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: '需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await context.request.json() as {
      name: string;
      permissions: string[];
      isReadonly?: boolean;
      expiresIn?: number | null; // 过期时间（毫秒），null 表示永久
    };

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return new Response(JSON.stringify({ error: '名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
      return new Response(JSON.stringify({ error: '权限不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查名称是否重复
    const existingKeys = await getAllApiKeys(context.env.ossShares);
    if (existingKeys.some(k => k.name === body.name.trim())) {
      return new Response(JSON.stringify({ error: '名称已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 计算过期时间
    let expiresAt: number | null = null;
    if (body.expiresIn && body.expiresIn > 0) {
      expiresAt = Date.now() + body.expiresIn;
    }

    // 创建 API Key
    const apiKey = await createApiKey(context.env.ossShares, {
      name: body.name.trim(),
      permissions: body.permissions,
      isReadonly: body.isReadonly || false,
      expiresAt,
      createdBy: username,
    });

    // 返回完整密钥（仅在创建时返回一次）
    return new Response(JSON.stringify({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // 完整密钥，仅此一次
        permissions: apiKey.permissions,
        isReadonly: apiKey.isReadonly,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        createdBy: apiKey.createdBy,
        enabled: apiKey.enabled,
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create API Key error:', error);
    return new Response(JSON.stringify({ error: '创建 API Key 失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
