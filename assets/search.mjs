const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "tif",
  "tiff",
  "webp",
]);

const VIDEO_EXTENSIONS = new Set([
  "3g2",
  "3gp",
  "avi",
  "flv",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "ogv",
  "webm",
  "wmv",
]);

const DOCUMENT_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "htm",
  "html",
  "json",
  "md",
  "pdf",
  "ppt",
  "pptx",
  "rtf",
  "txt",
  "xls",
  "xlsx",
  "xml",
  "yaml",
  "yml",
]);

const ARCHIVE_EXTENSIONS = new Set([
  "7z",
  "bz2",
  "ear",
  "gz",
  "jar",
  "lz",
  "lz4",
  "rar",
  "tar",
  "tbz",
  "tbz2",
  "tgz",
  "txz",
  "war",
  "xz",
  "zip",
  "zst",
]);

const EXECUTABLE_EXTENSIONS = new Set([
  "app",
  "apk",
  "bat",
  "cmd",
  "deb",
  "dmg",
  "exe",
  "msi",
  "pkg",
  "rpm",
  "run",
  "sh",
]);

const FILE_TYPE_ALIASES = new Map([
  // images
  ["img", "images"],
  ["image", "images"],
  ["images", "images"],
  ["图片", "images"],
  // videos
  ["vid", "videos"],
  ["video", "videos"],
  ["videos", "videos"],
  ["视频", "videos"],
  // documents
  ["doc", "documents"],
  ["document", "documents"],
  ["documents", "documents"],
  ["text", "documents"],
  ["文档", "documents"],
  ["文本", "documents"],
  // archives
  ["archive", "archives"],
  ["archives", "archives"],
  ["compressed", "archives"],
  ["zip", "archives"],
  ["jar", "archives"],
  ["压缩", "archives"],
  ["压缩包", "archives"],
  ["压缩/包", "archives"],
  ["包", "archives"],
  // executables
  ["exe", "executables"],
  ["exec", "executables"],
  ["executable", "executables"],
  ["executables", "executables"],
  ["程序", "executables"],
  ["可执行", "executables"],
  // others
  ["other", "others"],
  ["others", "others"],
  ["其他", "others"],
  // all
  ["all", "all"],
  ["全部", "all"],
]);

function normalizeContentType(contentType) {
  if (!contentType) return null;
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "application/octet-stream" || normalized === "binary/octet-stream") return null;
  return normalized;
}

export function getFileNameFromKey(key) {
  if (!key) return "";
  return key.split("/").pop() || "";
}

export function getFileExtension(key) {
  const name = getFileNameFromKey(key);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return name.slice(dotIndex + 1).toLowerCase();
}

export function getFileTypeForFile(file) {
  const contentType = normalizeContentType(file?.httpMetadata?.contentType);
  if (contentType) {
    if (contentType.startsWith("image/")) return "images";
    if (contentType.startsWith("video/")) return "videos";

    if (
      contentType === "application/java-archive" ||
      contentType === "application/zip" ||
      contentType === "application/x-zip-compressed" ||
      contentType === "application/x-7z-compressed" ||
      contentType === "application/x-rar-compressed" ||
      contentType === "application/vnd.rar" ||
      contentType === "application/x-tar" ||
      contentType === "application/gzip" ||
      contentType === "application/x-gzip" ||
      contentType === "application/x-bzip2" ||
      contentType === "application/x-xz" ||
      contentType === "application/zstd"
    ) {
      return "archives";
    }

    if (
      contentType === "application/x-msdownload" ||
      contentType === "application/vnd.microsoft.portable-executable" ||
      contentType === "application/x-dosexec" ||
      contentType === "application/x-executable" ||
      contentType === "application/x-apple-diskimage" ||
      contentType === "application/vnd.apple.installer+xml" ||
      contentType === "application/vnd.android.package-archive"
    ) {
      return "executables";
    }

    if (
      contentType === "application/pdf" ||
      contentType === "application/msword" ||
      contentType === "application/json" ||
      contentType === "application/xml" ||
      contentType.endsWith("+json") ||
      contentType.endsWith("+xml") ||
      contentType.startsWith("application/vnd.") ||
      contentType.startsWith("text/")
    ) {
      return "documents";
    }
  }

  const ext = getFileExtension(file?.key);
  if (IMAGE_EXTENSIONS.has(ext)) return "images";
  if (VIDEO_EXTENSIONS.has(ext)) return "videos";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "documents";
  if (ARCHIVE_EXTENSIONS.has(ext)) return "archives";
  if (EXECUTABLE_EXTENSIONS.has(ext)) return "executables";
  return "others";
}

function normalizeFileTypeToken(raw) {
  return (raw || "").trim().toLowerCase();
}

function parseSizeToBytes(raw) {
  const text = (raw || "").trim().toLowerCase();
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?)([a-z]+)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const unit = (match[2] || "b").toLowerCase();
  const unitMap = {
    b: 1,
    byte: 1,
    bytes: 1,
    k: 1024,
    kb: 1024,
    kib: 1024,
    m: 1024 ** 2,
    mb: 1024 ** 2,
    mib: 1024 ** 2,
    g: 1024 ** 3,
    gb: 1024 ** 3,
    gib: 1024 ** 3,
    t: 1024 ** 4,
    tb: 1024 ** 4,
    tib: 1024 ** 4,
  };

  const multiplier = unitMap[unit];
  if (!multiplier) return null;

  return Math.round(value * multiplier);
}

export function parseSearchQuery(rawQuery) {
  const filters = {
    nameTerms: [],
    types: null,
    extensions: null,
    minSizeBytes: null,
    maxSizeBytes: null,
  };

  const query = (rawQuery || "").trim();
  if (!query) return filters;

  const tokens = query.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const typeMatch = token.match(/^type:(.+)$/i);
    if (typeMatch) {
      const rawTypes = typeMatch[1].split(/[,，|]/).map((t) => t.trim()).filter(Boolean);
      const resolved = new Set();
      for (const t of rawTypes) {
        const mapped = FILE_TYPE_ALIASES.get(normalizeFileTypeToken(t));
        if (mapped === "all") {
          resolved.clear();
          break;
        }
        if (mapped) resolved.add(mapped);
      }
      if (resolved.size) filters.types = resolved;
      continue;
    }

    const extMatch = token.match(/^ext:(.+)$/i);
    if (extMatch) {
      const rawExts = extMatch[1].split(/[,，|]/).map((e) => e.trim()).filter(Boolean);
      const resolved = new Set();
      for (const e of rawExts) {
        const ext = e.startsWith(".") ? e.slice(1) : e;
        if (ext) resolved.add(ext.toLowerCase());
      }
      if (resolved.size) filters.extensions = resolved;
      continue;
    }

    const sizeCompareMatch = token.match(/^size(>=|<=|=|>|<)(.+)$/i);
    if (sizeCompareMatch) {
      const operator = sizeCompareMatch[1];
      const sizeBytes = parseSizeToBytes(sizeCompareMatch[2]);
      if (sizeBytes === null) continue;

      if (operator === "=") {
        filters.minSizeBytes = sizeBytes;
        filters.maxSizeBytes = sizeBytes;
        continue;
      }

      if (operator === ">" || operator === ">=") {
        filters.minSizeBytes =
          filters.minSizeBytes === null ? sizeBytes : Math.max(filters.minSizeBytes, sizeBytes);
        continue;
      }

      if (operator === "<" || operator === "<=") {
        filters.maxSizeBytes =
          filters.maxSizeBytes === null ? sizeBytes : Math.min(filters.maxSizeBytes, sizeBytes);
        continue;
      }
    }

    const sizeRangeMatch = token.match(/^size:(.+)$/i);
    if (sizeRangeMatch) {
      const rangeText = sizeRangeMatch[1].trim();
      const [minPartRaw, maxPartRaw] = rangeText.includes("..")
        ? rangeText.split("..")
        : rangeText.split("-");

      const minBytes = parseSizeToBytes(minPartRaw);
      const maxBytes = parseSizeToBytes(maxPartRaw);

      if (minBytes !== null) {
        filters.minSizeBytes =
          filters.minSizeBytes === null ? minBytes : Math.max(filters.minSizeBytes, minBytes);
      }
      if (maxBytes !== null) {
        filters.maxSizeBytes =
          filters.maxSizeBytes === null ? maxBytes : Math.min(filters.maxSizeBytes, maxBytes);
      }
      continue;
    }

    const bareExtMatch = token.match(/^\.([a-z0-9]{1,12})$/i);
    if (bareExtMatch) {
      if (!filters.extensions) filters.extensions = new Set();
      filters.extensions.add(bareExtMatch[1].toLowerCase());
      continue;
    }

    filters.nameTerms.push(token.toLowerCase());
  }

  return filters;
}
