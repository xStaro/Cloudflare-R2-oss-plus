// 最終修正：使用 require 語法以同時兼容本地 TypeScript 和 Cloudflare 運行環境
import JSZip = require('jszip');

// 這是一個 Cloudflare Pages 函數
// 最終修正：將 R2 綁定變量名從 R2_BUCKET 改為 BUCKET，以匹配項目中其他文件
export const onRequest: PagesFunction<{ BUCKET: any }> = async (context) => {
  try {
    const { request, env, params } = context;
    
    // 從 URL 中獲取資料夾路徑
    let folderPath = '';
    if (Array.isArray(params.path)) {
      folderPath = params.path.join('/');
    }

    if (!folderPath) {
      return new Response('Folder path is required.', { status: 400 });
    }

    // 在 R2 中列出該資料夾下的所有文件
    const list = await env.BUCKET.list({
      prefix: folderPath + '/',
    });

    if (list.objects.length === 0) {
      return new Response('Folder is empty or not found.', { status: 404 });
    }

    // 創建一個新的 JSZip 實例
    const zip = new JSZip();

    // 遍歷所有文件，將它們添加到 zip 包中
    for (const object of list.objects) {
      const file = await env.BUCKET.get(object.key);
      if (file) {
        // 從完整路徑中移除資料夾前綴，以保持正確的目錄結構
        const fileName = object.key.substring(folderPath.length + 1);
        zip.file(fileName, await file.arrayBuffer());
      }
    }

    // 生成 .zip 文件內容
    const zipContent = await zip.generateAsync({ type: 'blob' });

    // 提取資料夾名作為 zip 文件名
    const folderName = folderPath.split('/').pop() || 'download';

    // 返回 .zip 文件給用戶下載
    return new Response(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      },
    });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
};

