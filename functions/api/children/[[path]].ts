import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    // 规范化路径：移除末尾斜杠后再添加，确保格式一致
    const normalizedPath = path ? path.replace(/\/+$/, '') : '';
    const prefix = normalizedPath ? `${normalizedPath}/` : '';
    if (!bucket || normalizedPath.startsWith("_$flaredrive$")) return notFound();

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    const objKeys = objList.objects
      .filter((obj) => {
        // 过滤掉文件夹标记（以 _$folder$ 结尾）
        if (obj.key.endsWith("/_$folder$")) return false;
        // 过滤掉以 / 结尾的对象（空文件夹标记）
        if (obj.key.endsWith("/")) return false;
        // 过滤掉 prefix 本身（当前文件夹）
        if (obj.key === prefix) return false;
        return true;
      })
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!normalizedPath)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(JSON.stringify({ value: objKeys, folders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
