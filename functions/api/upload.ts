/**
 * PicGo 兼容的上传接口
 * 支持 multipart/form-data 格式上传
 *
 * 使用方式：
 * POST /api/upload?path=PicGo
 * Headers: Authorization: Bearer sk-xxx 或 X-API-Key: sk-xxx
 * Body: multipart/form-data, file 字段为文件
 *
 * 可选参数：
 * - path: 上传目录
 * - name: 自定义文件名
 * - conflict: 文件冲突处理方式 (rename/overwrite/error)，默认 rename
 * - timestamp: 是否使用时间戳重命名 (true/false)，默认 false
 */

import { extractApiKeyFromHeaders } from "@/utils/auth";
import { parseBucketPath } from "@/utils/bucket";

/**
 * 生成安全的文件名，移除危险字符
 */
function sanitizeFileName(fileName: string): string {
  // 移除路径遍历字符和其他危险字符
  return fileName
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .trim();
}

/**
 * 生成时间戳文件名
 */
function generateTimestampFileName(originalName: string): string {
  const timestamp = Date.now();
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalName}_${timestamp}`;
  }
  const nameWithoutExt = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${nameWithoutExt}_${timestamp}${ext}`;
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const [bucket] = await parseBucketPath(context);

  if (!bucket) {
    return new Response(JSON.stringify({ success: false, error: "存储桶未配置" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 获取上传路径
  const url = new URL(request.url);
  let uploadPath = url.searchParams.get("path") || "";

  // 移除开头和结尾的斜杠，标准化路径
  uploadPath = uploadPath.replace(/^\/+|\/+$/g, "");

  // 安全检查：防止路径遍历
  if (uploadPath.includes('..') || uploadPath.includes('\0')) {
    return new Response(JSON.stringify({ success: false, error: "非法路径" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 验证 API Key
  const headers = new Headers(request.headers);
  const apiKey = extractApiKeyFromHeaders(headers);

  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "未提供 API Key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 验证 API Key 并检查权限
  const { validateApiKey, checkApiKeyPathPermission } = await import("@/utils/apikey");
  const result = await validateApiKey(env.ossShares, apiKey);

  if (!result.valid || !result.apiKey) {
    return new Response(JSON.stringify({ success: false, error: result.error || "API Key 无效" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 检查是否只读
  if (result.apiKey.isReadonly) {
    return new Response(JSON.stringify({ success: false, error: "此 API Key 为只读，不能上传" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 检查路径权限
  if (uploadPath && !checkApiKeyPathPermission(result.apiKey, uploadPath)) {
    return new Response(JSON.stringify({ success: false, error: "没有此目录的上传权限" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 解析 multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "请求格式错误，需要 multipart/form-data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 获取文件
  const fileEntry = formData.get("file") as unknown;
  if (!fileEntry || typeof fileEntry === "string" || !(fileEntry as File).name) {
    return new Response(JSON.stringify({ success: false, error: "未找到文件，请使用 'file' 字段上传" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const file = fileEntry as File;

  // 生成文件名
  let fileName = sanitizeFileName(file.name);
  if (!fileName) {
    fileName = `file_${Date.now()}`;
  }

  // 如果需要自定义文件名
  const customName = url.searchParams.get("name");
  if (customName) {
    const sanitizedCustomName = sanitizeFileName(customName);
    if (sanitizedCustomName) {
      // 保留原始扩展名（如果自定义名称没有扩展名）
      const lastDotIndex = fileName.lastIndexOf('.');
      const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
      fileName = sanitizedCustomName.includes('.') ? sanitizedCustomName : sanitizedCustomName + ext;
    }
  }

  // 是否使用时间戳重命名
  const useTimestamp = url.searchParams.get("timestamp") === "true";
  if (useTimestamp) {
    fileName = generateTimestampFileName(fileName);
  }

  // 构建完整路径
  let fullPath = uploadPath ? `${uploadPath}/${fileName}` : fileName;

  // 文件冲突处理
  const conflictAction = url.searchParams.get("conflict") || "rename"; // rename, overwrite, error

  try {
    const existingFile = await bucket.head(fullPath);
    if (existingFile) {
      if (conflictAction === "error") {
        return new Response(JSON.stringify({
          success: false,
          error: "文件已存在",
          existingFile: fullPath
        }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      } else if (conflictAction === "rename") {
        // 自动添加时间戳重命名
        fileName = generateTimestampFileName(fileName);
        fullPath = uploadPath ? `${uploadPath}/${fileName}` : fileName;
      }
      // overwrite 情况下直接覆盖，无需额外处理
    }
  } catch (e) {
    // head 操作失败，文件可能不存在，继续上传
  }

  // 上传到 R2
  try {
    const obj = await bucket.put(fullPath, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    // 构建返回的 URL
    const encodedKey = String(fullPath || "")
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const pubUrl = env.PUBURL || env.FILE_BASE_URL || "";
    const origin = new URL(request.url).origin;
    const fileUrl = pubUrl
      ? `${String(pubUrl).replace(/\/+$/, "")}/${encodedKey}`
      : `${origin}/raw/${encodedKey}`;

    // 更新 API Key 最后使用时间
    const { updateApiKeyLastUsed } = await import("@/utils/apikey");
    updateApiKeyLastUsed(env.ossShares, result.apiKey.id).catch(() => {});

    // 返回 PicGo 兼容的响应格式
    return new Response(JSON.stringify({
      success: true,
      url: fileUrl,
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || "上传失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
