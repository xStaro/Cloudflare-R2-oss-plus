import { INTERNAL_PREFIX, THUMBNAILS_PATH, isAdminUserAsync } from "@/utils/auth";

interface Env {
  BUCKET: R2Bucket;
}

interface CleanupResult {
  success: boolean;
  scannedFiles: number;
  usedThumbnails: number;
  totalThumbnails: number;
  orphanedThumbnails: number;
  deletedThumbnails: string[];
  freedBytes: number;
  error?: string;
}

const LIST_PAGE_SIZE = 1000;

/**
 * 清理孤立的缩略图
 *
 * 工作流程：
 * 1. 扫描所有文件，收集正在使用的缩略图 hash（从 customMetadata.thumbnail）
 * 2. 列出 _$flaredrive$/thumbnails/ 中的所有缩略图
 * 3. 删除不在使用列表中的缩略图
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // 检查管理员权限（支持 API Key）
  const isAdmin = await isAdminUserAsync(context);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "需要管理员权限" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { BUCKET } = context.env;
  const url = new URL(context.request.url);
  const dryRun = url.searchParams.has('dry-run');

  const result: CleanupResult = {
    success: false,
    scannedFiles: 0,
    usedThumbnails: 0,
    totalThumbnails: 0,
    orphanedThumbnails: 0,
    deletedThumbnails: [],
    freedBytes: 0,
  };

  try {
    // Step 1: 扫描所有文件，收集正在使用的缩略图 hash
    const usedThumbnailHashes = new Set<string>();
    let cursor: string | undefined;

    do {
      const listed = await BUCKET.list({
        cursor,
        limit: LIST_PAGE_SIZE,
        include: ['customMetadata'],
      });

      for (const object of listed.objects) {
        // 跳过内部文件
        if (object.key.startsWith(`${INTERNAL_PREFIX}/`)) continue;

        result.scannedFiles++;

        // 获取缩略图 hash
        const thumbnailHash = object.customMetadata?.thumbnail;
        if (thumbnailHash) {
          usedThumbnailHashes.add(thumbnailHash);
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    result.usedThumbnails = usedThumbnailHashes.size;

    // Step 2: 列出所有缩略图
    const allThumbnails: { key: string; hash: string; size: number }[] = [];
    cursor = undefined;

    do {
      const listed = await BUCKET.list({
        prefix: THUMBNAILS_PATH,
        cursor,
        limit: LIST_PAGE_SIZE,
      });

      for (const object of listed.objects) {
        // 提取 hash（文件名去掉 .png 后缀）
        const fileName = object.key.split('/').pop() || '';
        const hash = fileName.replace('.png', '');

        allThumbnails.push({
          key: object.key,
          hash,
          size: object.size,
        });
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    result.totalThumbnails = allThumbnails.length;

    // Step 3: 找出并删除孤立的缩略图
    const orphanedThumbnails = allThumbnails.filter(
      (t) => !usedThumbnailHashes.has(t.hash)
    );

    result.orphanedThumbnails = orphanedThumbnails.length;

    if (!dryRun && orphanedThumbnails.length > 0) {
      // 批量删除（R2 支持批量删除，但每次最多 1000 个）
      const keysToDelete = orphanedThumbnails.map((t) => t.key);

      // 分批删除
      for (let i = 0; i < keysToDelete.length; i += 1000) {
        const batch = keysToDelete.slice(i, i + 1000);
        await Promise.all(batch.map((key) => BUCKET.delete(key)));
      }

      result.deletedThumbnails = keysToDelete;
      result.freedBytes = orphanedThumbnails.reduce((sum, t) => sum + t.size, 0);
    } else if (dryRun) {
      // 预览模式：只返回会被删除的列表
      result.deletedThumbnails = orphanedThumbnails.map((t) => t.key);
      result.freedBytes = orphanedThumbnails.reduce((sum, t) => sum + t.size, 0);
    }

    result.success = true;

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    result.error = error.message || 'Unknown error';
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// GET 请求：返回当前状态（预览模式）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 检查管理员权限（支持 API Key）
  const isAdmin = await isAdminUserAsync(context);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "需要管理员权限" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 重定向到 dry-run 模式
  const url = new URL(context.request.url);
  url.searchParams.set('dry-run', '1');

  // 创建新的请求，模拟 POST
  const newContext = {
    ...context,
    request: new Request(url.toString(), {
      method: 'POST',
      headers: context.request.headers,
    }),
  };

  return onRequestPost(newContext as any);
};
