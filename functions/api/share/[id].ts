import { ShareData, verifyPassword } from "@/utils/share";

interface Env {
  BUCKET: R2Bucket;
  ossShares: KVNamespace;
}

// GET - 获取分享信息
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const shareId = context.params.id as string;

  try {
    const shareJson = await context.env.ossShares.get(`share:${shareId}`);
    if (!shareJson) {
      return new Response(JSON.stringify({ error: '分享不存在或已过期' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const share: ShareData = JSON.parse(shareJson);

    // 检查是否过期
    if (share.expiresAt && Date.now() > share.expiresAt) {
      await context.env.ossShares.delete(`share:${shareId}`);
      return new Response(JSON.stringify({ error: '分享已过期' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return new Response(JSON.stringify({ error: '分享已达到最大下载次数' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回公开信息（不包含密码哈希）
    return new Response(JSON.stringify({
      id: share.id,
      fileName: share.fileName,
      fileSize: share.fileSize,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      hasPassword: !!share.password,
      maxDownloads: share.maxDownloads || null,
      downloads: share.downloads,
      remainingDownloads: share.maxDownloads ? share.maxDownloads - share.downloads : null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get share error:', error);
    return new Response(JSON.stringify({ error: '获取分享信息失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - 删除分享
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const shareId = context.params.id as string;

  // 验证用户权限
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '需要登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const shareJson = await context.env.ossShares.get(`share:${shareId}`);
    if (!shareJson) {
      return new Response(JSON.stringify({ error: '分享不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const share: ShareData = JSON.parse(shareJson);

    // 获取当前用户名
    const base64 = authHeader.split("Basic ")[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const account = new TextDecoder().decode(bytes);
    const username = account.split(':')[0];

    // 检查是否是创建者或管理员
    const userPerms = context.env[account];
    const isAdmin = userPerms === '*';
    if (share.createdBy !== username && !isAdmin) {
      return new Response(JSON.stringify({ error: '没有权限删除此分享' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await context.env.ossShares.delete(`share:${shareId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete share error:', error);
    return new Response(JSON.stringify({ error: '删除分享失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
