interface Env {
  BUCKET: R2Bucket;
  PUBURL?: string;
  FILE_BASE_URL?: string;
}

/**
 * 返回前端需要的公共配置
 *
 * FILE_BASE_URL 优先级：
 * 1. 环境变量 FILE_BASE_URL（用于 CDN 回源场景）
 * 2. 空字符串，使用相对路径 /raw/（默认，直接从 Pages 获取）
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  // FILE_BASE_URL: 用于 CDN 回源场景
  // 例如设置为 https://cdn.example.com，前端会请求 https://cdn.example.com/file.jpg
  // 如果不设置，前端使用 /raw/file.jpg（通过 Pages Function 代理）
  const fileBaseUrl = env.FILE_BASE_URL || '';

  return Response.json({
    fileBaseUrl,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
    }
  });
};
