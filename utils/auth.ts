export function get_auth_status(context) {
    var dopath = context.request.url.split("/api/write/items/")[1]
    var headers = new Headers(context.request.headers);

    // 检查是否有登录凭据
    const authHeader = headers.get('Authorization');

    // 如果有登录凭据，验证用户权限
    if (authHeader && authHeader.startsWith('Basic ')) {
        const Authorization = authHeader.split("Basic ")[1]
        // 使用 TextDecoder 处理 Unicode 字符
        const binaryStr = atob(Authorization);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        const account = new TextDecoder().decode(bytes);
        if (!account) return false;
        if (!context.env[account]) return false;

        // 缩略图始终允许
        if (dopath.startsWith("_$flaredrive$/thumbnails/")) return true;

        const allow = context.env[account].split(",")
        for (var a of allow) {
            const trimmed = a.trim();
            if (trimmed == "*") {
                return true
            } else if (trimmed === 'readonly') {
                // 只读用户不能写入
                continue;
            } else if (dopath.startsWith(trimmed.replace(/^\//, ''))) {
                return true
            }
        }
        return false;
    }

    // 访客模式 - 需要验证上传密码
    if (context.env["GUEST"]) {
        // 缩略图始终允许
        if (dopath.startsWith("_$flaredrive$/thumbnails/")) return true;

        // 检查访客上传密码
        const guestUploadPassword = context.env["GUEST_UPLOAD_PASSWORD"];
        if (guestUploadPassword) {
            const providedPassword = headers.get('X-Guest-Password');
            if (providedPassword !== guestUploadPassword) {
                return false;
            }
        }

        // 验证访客可写目录
        const allow_guest = context.env["GUEST"].split(",")
        for (var aa of allow_guest) {
            const trimmed = aa.trim();
            if (trimmed == "*") {
                return true
            } else if (dopath.startsWith(trimmed)) {
                return true
            }
        }
    }

    return false;
}
  