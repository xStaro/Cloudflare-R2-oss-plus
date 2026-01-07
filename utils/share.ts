// 分享数据结构
export interface ShareData {
  id: string;
  key: string;              // 文件路径
  fileName: string;         // 文件名
  fileSize: number;         // 文件大小
  createdAt: number;        // 创建时间戳
  expiresAt: number | null; // 过期时间戳，null 表示永久
  driveId?: string;         // 可选：创建时所属 drive（多后端场景）
  host?: string;            // 可选：创建时域名（用于跨域名访问重定向）
  password?: string;        // 可选：访问密码（已加密）
  maxDownloads?: number;    // 可选：最大下载次数
  downloads: number;        // 已下载次数
  createdBy: string;        // 创建者
}

// 生成随机分享 ID
export function generateShareId(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 计算过期时间
export function calculateExpiry(duration: string, customMinutes?: number): number | null {
  const now = Date.now();

  switch (duration) {
    case '1h':
      return now + 60 * 60 * 1000;
    case '1d':
      return now + 24 * 60 * 60 * 1000;
    case '7d':
      return now + 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now + 30 * 24 * 60 * 60 * 1000;
    case 'custom':
      if (customMinutes && customMinutes > 0) {
        return now + customMinutes * 60 * 1000;
      }
      return now + 24 * 60 * 60 * 1000; // 默认 1 天
    case 'forever':
    default:
      return null; // 永久
  }
}

// 计算 KV TTL（秒）
export function calculateTTL(expiresAt: number | null): number | undefined {
  if (expiresAt === null) {
    return undefined; // 永久，不设置 TTL
  }
  const ttlSeconds = Math.floor((expiresAt - Date.now()) / 1000);
  return ttlSeconds > 0 ? ttlSeconds : 60; // 最少 60 秒
}

// 简单密码哈希（生产环境建议使用更强的哈希）
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
