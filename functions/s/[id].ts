import { ShareData, verifyPassword, formatFileSize } from "@/utils/share";
import { parseBucketPath } from "@/utils/bucket";

interface Env {
  BUCKET: R2Bucket;
  ossShares: KVNamespace;
  PUBURL?: string;
}

// 生成分享页面 HTML
function generateSharePage(share: ShareData, origin: string, error?: string): string {
  const expiryText = share.expiresAt
    ? new Date(share.expiresAt).toLocaleString('zh-CN')
    : '永久有效';

  const remainingDownloads = share.maxDownloads
    ? `${share.maxDownloads - share.downloads} / ${share.maxDownloads}`
    : '无限制';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${share.fileName} - 文件分享</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 450px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 15px;
      background: rgba(255,255,255,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { width: 32px; height: 32px; }
    .filename {
      font-size: 18px;
      font-weight: 600;
      word-break: break-all;
      margin-bottom: 8px;
    }
    .filesize {
      font-size: 14px;
      opacity: 0.9;
    }
    .content { padding: 30px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; }
    .info-value { font-weight: 500; color: #333; }
    .password-form {
      margin-top: 20px;
    }
    .input-group {
      margin-bottom: 15px;
    }
    .input-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #666;
    }
    .input-group input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .input-group input:focus {
      outline: none;
      border-color: #667eea;
    }
    .error {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .wget-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .wget-title {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .wget-cmd {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      font-size: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .expired {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .expired svg {
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M12 18v-6"/>
          <path d="M9 15l3 3 3-3"/>
        </svg>
      </div>
      <div class="filename">${escapeHtml(share.fileName)}</div>
      <div class="filesize">${formatFileSize(share.fileSize)}</div>
    </div>
    <div class="content">
      <div class="info-row">
        <span class="info-label">有效期至</span>
        <span class="info-value">${expiryText}</span>
      </div>
      <div class="info-row">
        <span class="info-label">剩余下载</span>
        <span class="info-value">${remainingDownloads}</span>
      </div>

      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

      <form class="password-form" method="POST">
        ${share.password ? `
        <div class="input-group">
          <label for="password">访问密码</label>
          <input type="password" id="password" name="password" placeholder="请输入密码" required>
        </div>
        ` : ''}
        <button type="submit" class="btn btn-primary">
          <svg style="width:18px;height:18px;vertical-align:middle;margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          下载文件
        </button>
      </form>

      <div class="wget-section">
        <div class="wget-title">wget 命令：</div>
        <div class="wget-cmd" id="wget-cmd">
          wget --content-disposition "${origin}/s/${share.id}/download${share.password ? '?pwd=YOUR_PASSWORD' : ''}"
          <button class="copy-btn" onclick="copyWget()">复制</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    function copyWget() {
      const cmd = document.getElementById('wget-cmd').innerText.replace('复制', '').trim();
      navigator.clipboard.writeText(cmd).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '已复制';
        setTimeout(() => btn.textContent = '复制', 2000);
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateExpiredPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>分享已失效</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 100%;
      padding: 50px 30px;
      text-align: center;
    }
    svg { width: 80px; height: 80px; color: #ccc; margin-bottom: 20px; }
    h2 { color: #333; margin-bottom: 10px; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <h2>分享已失效</h2>
    <p>该分享链接已过期或已达到最大下载次数</p>
  </div>
</body>
</html>`;
}

// GET - 显示分享页面
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const shareId = context.params.id as string;
  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;

  try {
    const shareJson = await context.env.ossShares.get(`share:${shareId}`);
    if (!shareJson) {
      return new Response(generateExpiredPage(), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const share: ShareData = JSON.parse(shareJson);

    // 多后端场景：确保在创建分享时的域名下访问
    if (share.host && share.host !== requestUrl.hostname) {
      const target = new URL(requestUrl.toString());
      target.hostname = share.host;
      return Response.redirect(target.toString(), 302);
    }

    // 检查是否过期
    if (share.expiresAt && Date.now() > share.expiresAt) {
      await context.env.ossShares.delete(`share:${shareId}`);
      return new Response(generateExpiredPage(), {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return new Response(generateExpiredPage(), {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response(generateSharePage(share, origin), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Share page error:', error);
    return new Response(generateExpiredPage(), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

// POST - 处理下载请求（验证密码后重定向到下载）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const shareId = context.params.id as string;
  const requestUrl = new URL(context.request.url);
  const origin = requestUrl.origin;

  try {
    const shareJson = await context.env.ossShares.get(`share:${shareId}`);
    if (!shareJson) {
      return new Response(generateExpiredPage(), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const share: ShareData = JSON.parse(shareJson);

    // 多后端场景：确保在创建分享时的域名下访问（保持 POST 方法）
    if (share.host && share.host !== requestUrl.hostname) {
      const target = new URL(requestUrl.toString());
      target.hostname = share.host;
      return Response.redirect(target.toString(), 307);
    }

    // 检查是否过期
    if (share.expiresAt && Date.now() > share.expiresAt) {
      await context.env.ossShares.delete(`share:${shareId}`);
      return new Response(generateExpiredPage(), {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 检查下载次数
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return new Response(generateExpiredPage(), {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 验证密码
    if (share.password) {
      const formData = await context.request.formData();
      const password = formData.get('password') as string;

      if (!password || !(await verifyPassword(password, share.password))) {
        return new Response(generateSharePage(share, origin, '密码错误'), {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
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

    // 获取文件并返回
    const [bucket] = parseBucketPath(context);
    if (!bucket || typeof bucket.get !== "function") {
      return new Response('存储桶未配置', { status: 500 });
    }
    const obj = await bucket.get(share.key);

    if (!obj) {
      return new Response('文件不存在', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(share.fileName)}`);
    headers.set('Content-Length', obj.size.toString());

    return new Response(obj.body, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return new Response('下载失败', { status: 500 });
  }
};
