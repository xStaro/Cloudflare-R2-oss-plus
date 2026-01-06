/**
 * PicGo 兼容的上传接口
 * 支持 multipart/form-data 格式上传
 *
 * 使用方式：
 * POST /api/upload?path=PicGo
 * Headers: Authorization: Bearer sk-xxx 或 X-API-Key: sk-xxx
 * Body: multipart/form-data, file 字段为文件
 */

import { extractApiKeyFromHeaders, THUMBNAILS_PATH } from "@/utils/auth";

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const bucket = env.BUCKET;

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
  const file = formData.get("file") as File | null;
  if (!file) {
    return new Response(JSON.stringify({ success: false, error: "未找到文件，请使用 'file' 字段上传" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 生成文件名（保留原始文件名，或使用时间戳）
  let fileName = file.name;

  // 如果需要重命名（可选参数）
  const customName = url.searchParams.get("name");
  if (customName) {
    // 保留原始扩展名
    const ext = fileName.substring(fileName.lastIndexOf("."));
    fileName = customName.includes(".") ? customName : customName + ext;
  }

  // 构建完整路径
  const fullPath = uploadPath ? `${uploadPath}/${fileName}` : fileName;

  // 上传到 R2
  try {
    const obj = await bucket.put(fullPath, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    // 构建返回的 URL
    const pubUrl = env.PUBURL || "";
    const fileUrl = pubUrl ? `${pubUrl.replace(/\/$/, "")}/${fullPath}` : `/${fullPath}`;

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
