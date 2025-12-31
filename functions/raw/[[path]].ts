import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const pubUrl = context.env["PUBURL"];
  if (!pubUrl) {
    return new Response("PUBURL environment variable is not configured", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // 提取 /raw/ 之后的路径
  const filePath = context.request.url.split("/raw/")[1];
  if (!filePath) {
    return notFound();
  }

  const url = `${pubUrl}/${filePath}`;

  try {
    const response = await fetch(new Request(url, {
      headers: context.request.headers,
      method: context.request.method,
      redirect: "follow",
    }));

    const headers = new Headers(response.headers);

    // 缩略图设置长期缓存
    if (path.startsWith("_$flaredrive$/thumbnails/")) {
      headers.set("Cache-Control", "max-age=31536000");
    }

    // 添加 CORS 头
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      headers: headers,
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return new Response(`Failed to fetch from origin: ${error.message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain" }
    });
  }
}