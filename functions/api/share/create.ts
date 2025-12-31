import { parseBucketPath } from "@/utils/bucket";
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
}

// 验证用户是否有写入权限
function checkWritePermission(context: any): boolean {
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');
  if (!authHeader) return false;

  try {
    const base64 = authHeader.split("Basic ")[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const account = new TextDecoder().decode(bytes);
    if (!account) return false;

    // 检查用户权限
    const userPerms = context.env[account];
    if (!userPerms) return false;

    // 检查是否是只读用户
    if (userPerms === 'readonly') return false;

    return true;
  } catch {
    return false;
  }
}

// 获取用户名
function getUsername(context: any): string {
  const headers = new Headers(context.request.headers);
  const authHeader = headers.get('Authorization');
  if (!authHeader) return 'anonymous';

  try {
    const base64 = authHeader.split("Basic ")[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const account = new TextDecoder().decode(bytes);
    return account.split(':')[0] || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // 检查权限
  if (!checkWritePermission(context)) {
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
    const bucket = context.env.BUCKET;
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

    // 创建分享数据
    const shareData: ShareData = {
      id: shareId,
      key: key,
      fileName: key.split('/').pop() || key,
      fileSize: obj.size,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      downloads: 0,
      createdBy: getUsername(context)
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
