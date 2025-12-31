import { ShareData, verifyPassword } from "@/utils/share";

interface Env {
  BUCKET: R2Bucket;
  ossShares: KVNamespace;
}

// GET - 直接下载（用于 wget 等工具）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const shareId = context.params.id as string;
  const url = new URL(context.request.url);
  const password = url.searchParams.get('pwd');

  try {
    const shareJson = await context.env.ossShares.get(`share:${shareId}`);
    if (!shareJson) {
      return new Response('分享不存在或已过期', { status: 404 });
    }

    const share: ShareData = JSON.parse(shareJson);

    // 检查是否过期
    if (share.expiresAt && Date.now() > share.expiresAt) {
      await context.env.ossShares.delete(`share:${shareId}`);
      return new Response('分享已过期', { status: 410 });
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return new Response('已达到最大下载次数', { status: 410 });
    }

    // 验证密码
    if (share.password) {
      if (!password) {
        return new Response('需要密码，请使用 ?pwd=YOUR_PASSWORD 参数', { status: 401 });
      }
      if (!(await verifyPassword(password, share.password))) {
        return new Response('密码错误', { status: 401 });
      }
    }

    // 更新下载次数
    share.downloads++;
    const ttl = share.expiresAt ? Math.floor((share.expiresAt - Date.now()) / 1000) : undefined;
    const kvOptions: KVNamespacePutOptions = {};
    if (ttl && ttl > 0) {
      kvOptions.expirationTtl = ttl;
    }
    await context.env.ossShares.put(`share:${shareId}`, JSON.stringify(share), kvOptions);

    // 获取文件
    const bucket = context.env.BUCKET;
    const obj = await bucket.get(share.key);

    if (!obj) {
      return new Response('文件不存在', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(share.fileName)}`);
    headers.set('Content-Length', obj.size.toString());
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(obj.body, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return new Response('下载失败', { status: 500 });
  }
};
