import { ShareData } from "@/utils/share";
import { decodeBasicAuth } from "@/utils/auth";

interface Env {
  ossShares: KVNamespace;
  [key: string]: any;
}

// GET - 列出当前用户的分享
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');

  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return new Response(JSON.stringify({ error: '需要登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { username, account } = credentials;
    const userPerms = context.env[account];
    const isAdmin = userPerms === '*' || (userPerms && userPerms.split(',').map((p: string) => p.trim()).includes('*'));

    // 列出所有分享
    const list = await context.env.ossShares.list({ prefix: 'share:' });
    const shares: any[] = [];
    const now = Date.now();

    for (const key of list.keys) {
      try {
        const shareJson = await context.env.ossShares.get(key.name);
        if (shareJson) {
          const share: ShareData = JSON.parse(shareJson);

          // 只返回当前用户的分享（管理员可以看到所有）
          if (!isAdmin && share.createdBy !== username) {
            continue;
          }

          // 检查是否过期
          if (share.expiresAt && now > share.expiresAt) {
            await context.env.ossShares.delete(key.name);
            continue;
          }

          shares.push({
            id: share.id,
            fileName: share.fileName,
            fileSize: share.fileSize,
            createdAt: share.createdAt,
            expiresAt: share.expiresAt,
            hasPassword: !!share.password,
            maxDownloads: share.maxDownloads || null,
            downloads: share.downloads,
            createdBy: share.createdBy
          });
        }
      } catch {
        // 跳过无法解析的分享数据
        continue;
      }
    }

    // 按创建时间倒序排列
    shares.sort((a, b) => b.createdAt - a.createdAt);

    return new Response(JSON.stringify({ shares }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List shares error:', error);
    return new Response(JSON.stringify({ error: '获取分享列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
