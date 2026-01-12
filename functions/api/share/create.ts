import { parseBucketPath } from "@/utils/bucket";
import { decodeBasicAuth } from "@/utils/auth";
import {
  ShareData,
  generateShareId,
  calculateExpiry,
  calculateTTL,
  hashPassword
} from "@/utils/share";

interface Env {
  BUCKET: R2Bucket;
  ossShares: KVNamespace;
  [key: string]: any;
}

// 验证用户是否有写入权限
function checkWritePermission(context: any): { allowed: boolean; username: string } {
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');

  const credentials = decodeBasicAuth(authHeader || '');
  if (!credentials) {
    return { allowed: false, username: '' };
  }

  const { username, account } = credentials;

  // 检查用户权限
  const userPerms = context.env[account];
  if (!userPerms) return { allowed: false, username };

  // 解析权限列表
  const permissions = userPerms.split(',').map((p: string) => p.trim());

  // 检查是否是只读用户
  if (permissions.includes('readonly')) {
    return { allowed: false, username };
  }

  // 管理员或有任何写权限的用户都可以创建分享
  return { allowed: true, username };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // 检查权限
  const { allowed, username } = checkWritePermission(context);
  if (!allowed) {
    return new Response(JSON.stringify({ error: '没有权限创建分享' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await context.request.json() as {
      key: string;
      duration: string;
      customMinutes?: number;
      password?: string;
      maxDownloads?: number;
    };

    const { key, duration, customMinutes, password, maxDownloads } = body;

    if (!key) {
      return new Response(JSON.stringify({ error: '文件路径不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取文件信息
    const [bucket] = await parseBucketPath(context);
    if (!bucket || typeof bucket.head !== "function") {
      return new Response(JSON.stringify({ error: '存储桶未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const obj = await bucket.head(key);
    if (!obj) {
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成分享 ID
    const shareId = generateShareId();
    const expiresAt = calculateExpiry(duration, customMinutes);
    const ttl = calculateTTL(expiresAt);

    const requestUrl = new URL(context.request.url);
    const host = requestUrl.hostname;
    const driveId = host.replace(/\..*/, "");

    // 创建分享数据
    const shareData: ShareData = {
      id: shareId,
      key: key,
      fileName: key.split('/').pop() || key,
      fileSize: obj.size,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      driveId,
      host,
      downloads: 0,
      createdBy: username || 'anonymous'
    };

    // 添加可选字段
    if (password) {
      shareData.password = await hashPassword(password);
    }
    if (maxDownloads && maxDownloads > 0) {
      shareData.maxDownloads = maxDownloads;
    }

    // 保存到 KV
    const kvOptions: KVNamespacePutOptions = {};
    if (ttl) {
      kvOptions.expirationTtl = ttl;
    }
    await context.env.ossShares.put(`share:${shareId}`, JSON.stringify(shareData), kvOptions);

    // 生成分享链接
    const origin = new URL(context.request.url).origin;
    const shareUrl = `${origin}/s/${shareId}`;
    const downloadUrl = `${origin}/s/${shareId}/download`;
    const wgetCommand = password
      ? `wget --content-disposition "${downloadUrl}?pwd=YOUR_PASSWORD"`
      : `wget --content-disposition "${downloadUrl}"`;

    return new Response(JSON.stringify({
      success: true,
      share: {
        id: shareId,
        url: shareUrl,
        downloadUrl: downloadUrl,
        wgetCommand: wgetCommand,
        fileName: shareData.fileName,
        fileSize: shareData.fileSize,
        expiresAt: expiresAt,
        hasPassword: !!password,
        maxDownloads: maxDownloads || null
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create share error:', error);
    return new Response(JSON.stringify({ error: '创建分享失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
