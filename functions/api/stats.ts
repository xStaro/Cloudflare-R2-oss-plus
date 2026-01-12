import { INTERNAL_PREFIX, FOLDER_MARKER } from "@/utils/auth";
import { parseBucketPath } from "@/utils/bucket";

interface Env {
  BUCKET: R2Bucket;
  // Optional: for R2 operations analytics
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  R2_BUCKET_NAME?: string;
}

// ==================== 常量 ====================
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ANALYTICS_PERIOD_DAYS = 30;
const LIST_PAGE_SIZE = 1000;

interface FileTypeStats {
  count: number;
  size: number;
}

type FileType = 'images' | 'videos' | 'documents' | 'archives' | 'executables' | 'others';

interface OperationsStats {
  classA: number;
  classB: number;
  period: string;
  configured: boolean;
}

interface StatsResponse {
  storage: {
    totalSize: number;
    totalFiles: number;
    totalFolders: number;
    fileTypes: {
      images: FileTypeStats;
      videos: FileTypeStats;
      documents: FileTypeStats;
      archives: FileTypeStats;
      executables: FileTypeStats;
      others: FileTypeStats;
    };
  };
  operations: OperationsStats;
  cached: boolean;
  cachedAt?: string;
}

// Simple in-memory cache (will reset on cold start). Keyed by hostname for multi-backend scenarios.
let statsCache = new Map<string, { data: StatsResponse; timestamp: number }>();

// Class A operations (write operations)
const CLASS_A_ACTIONS = [
  'ListBuckets', 'PutBucket', 'DeleteBucket', 'ListObjects', 'PutObject',
  'CopyObject', 'DeleteObject', 'DeleteObjects', 'CompleteMultipartUpload',
  'CreateMultipartUpload', 'UploadPart', 'UploadPartCopy', 'AbortMultipartUpload',
  'ListMultipartUploads', 'ListParts', 'PutBucketLifecycleConfiguration',
  'DeleteBucketLifecycleConfiguration', 'PutBucketCors', 'DeleteBucketCors',
  'PutBucketEncryption', 'DeleteBucketEncryption'
];

// Class B operations (read operations)
const CLASS_B_ACTIONS = [
  'HeadBucket', 'HeadObject', 'GetObject', 'GetBucketLocation',
  'GetBucketCors', 'GetBucketEncryption', 'GetBucketLifecycleConfiguration'
];

function getFileType(contentType: string): FileType {
  if (contentType.startsWith('image/')) return 'images';
  if (contentType.startsWith('video/')) return 'videos';

  if (
    contentType === 'application/java-archive' ||
    contentType === 'application/zip' ||
    contentType === 'application/x-zip-compressed' ||
    contentType === 'application/x-7z-compressed' ||
    contentType === 'application/x-rar-compressed' ||
    contentType === 'application/vnd.rar' ||
    contentType === 'application/x-tar' ||
    contentType === 'application/gzip' ||
    contentType === 'application/x-gzip' ||
    contentType === 'application/x-bzip2' ||
    contentType === 'application/x-xz' ||
    contentType === 'application/zstd'
  ) {
    return 'archives';
  }

  if (
    contentType === 'application/x-msdownload' ||
    contentType === 'application/vnd.microsoft.portable-executable' ||
    contentType === 'application/x-dosexec' ||
    contentType === 'application/x-executable' ||
    contentType === 'application/x-apple-diskimage' ||
    contentType === 'application/vnd.apple.installer+xml' ||
    contentType === 'application/vnd.android.package-archive'
  ) {
    return 'executables';
  }

  if (
    contentType === 'application/pdf' ||
    contentType === 'application/msword' ||
    contentType === 'application/json' ||
    contentType === 'application/xml' ||
    contentType.endsWith('+json') ||
    contentType.endsWith('+xml') ||
    contentType.startsWith('application/vnd.') ||
    contentType.startsWith('text/')
  ) {
    return 'documents';
  }
  return 'others';
}

const IMAGE_EXTENSIONS = new Set([
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

const VIDEO_EXTENSIONS = new Set([
  '3g2',
  '3gp',
  'avi',
  'flv',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'ogv',
  'webm',
  'wmv',
]);

const DOCUMENT_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'htm',
  'html',
  'json',
  'md',
  'pdf',
  'ppt',
  'pptx',
  'rtf',
  'ts',
  'txt',
  'xls',
  'xlsx',
  'xml',
  'yaml',
  'yml',
]);

const ARCHIVE_EXTENSIONS = new Set([
  '7z',
  'bz2',
  'ear',
  'gz',
  'jar',
  'lz',
  'lz4',
  'rar',
  'tar',
  'tbz',
  'tbz2',
  'tgz',
  'txz',
  'war',
  'xz',
  'zip',
  'zst',
]);

const EXECUTABLE_EXTENSIONS = new Set([
  'app',
  'bat',
  'cmd',
  'dmg',
  'exe',
  'msi',
  'pkg',
  'run',
  'sh',
]);

function normalizeContentType(contentType: string | undefined): string | null {
  if (!contentType) return null;
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'application/octet-stream' || normalized === 'binary/octet-stream') return null;
  return normalized;
}

function getFileExtension(key: string): string | null {
  const lastDot = key.lastIndexOf('.');
  const lastSlash = key.lastIndexOf('/');
  if (lastDot <= lastSlash) return null;
  const ext = key.slice(lastDot + 1).trim().toLowerCase();
  return ext || null;
}

function getFileTypeFromMetadata(contentType: string | undefined, key: string): FileType {
  const normalizedContentType = normalizeContentType(contentType);
  if (normalizedContentType) {
    const fileType = getFileType(normalizedContentType);
    if (fileType !== 'others') return fileType;
  }

  const ext = getFileExtension(key);
  if (!ext) return 'others';
  if (IMAGE_EXTENSIONS.has(ext)) return 'images';
  if (VIDEO_EXTENSIONS.has(ext)) return 'videos';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'documents';
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archives';
  if (EXECUTABLE_EXTENSIONS.has(ext)) return 'executables';
  return 'others';
}

async function fetchOperationsStats(env: Env): Promise<OperationsStats> {
  const { CF_ACCOUNT_ID, CF_API_TOKEN, R2_BUCKET_NAME } = env;

  // Check if analytics is configured
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return {
      classA: 0,
      classB: 0,
      period: '',
      configured: false,
    };
  }

  // Calculate date range
  const now = new Date();
  const periodStart = new Date(now.getTime() - ANALYTICS_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const startDate = periodStart.toISOString();
  const endDate = now.toISOString();
  const startDateDisplay = startDate.split('T')[0];
  const endDateDisplay = endDate.split('T')[0];

  // Build filter object
  const filter: Record<string, any> = {
    datetime_geq: startDate,
    datetime_lt: endDate,
  };

  if (R2_BUCKET_NAME) {
    filter.bucketName = R2_BUCKET_NAME;
  }

  // Build GraphQL query - use proper syntax
  const query = `
    query GetR2Operations($accountTag: String!, $filter: AccountR2OperationsAdaptiveGroupsFilter_InputObject!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2OperationsAdaptiveGroups(
            filter: $filter
            limit: 10000
          ) {
            sum {
              requests
            }
            dimensions {
              actionType
            }
          }
        }
      }
    }
  `;

  const variables = {
    accountTag: CF_ACCOUNT_ID,
    filter,
  };

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CF_API_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analytics API error:', response.status, errorText);
      return { classA: 0, classB: 0, period: `${startDateDisplay} - ${endDateDisplay}`, configured: true };
    }

    const data = await response.json() as any;

    if (data.errors) {
      console.error('GraphQL errors:', JSON.stringify(data.errors));
      return { classA: 0, classB: 0, period: `${startDateDisplay} - ${endDateDisplay}`, configured: true };
    }

    const groups = data.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups || [];

    let classA = 0;
    let classB = 0;

    for (const group of groups) {
      const actionType = group.dimensions?.actionType;
      const requests = group.sum?.requests || 0;

      if (CLASS_A_ACTIONS.includes(actionType)) {
        classA += requests;
      } else if (CLASS_B_ACTIONS.includes(actionType)) {
        classB += requests;
      }
    }

    return {
      classA,
      classB,
      period: `${startDateDisplay} - ${endDateDisplay}`,
      configured: true,
    };
  } catch (error) {
    console.error('Failed to fetch operations stats:', error);
    return { classA: 0, classB: 0, period: `${startDateDisplay} - ${endDateDisplay}`, configured: true };
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const cacheKey = url.hostname;
  const [BUCKET] = await parseBucketPath(context);
  if (!BUCKET) {
    return Response.json({ error: "存储桶未配置" }, { status: 500 });
  }
  const forceRefresh = url.searchParams.has('refresh') || url.searchParams.has('nocache');

  // Check cache
  const cached = statsCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Response.json({
      ...cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
    });
  }

  // Calculate stats by listing all objects
  const stats: StatsResponse = {
    storage: {
      totalSize: 0,
      totalFiles: 0,
      totalFolders: 0,
      fileTypes: {
        images: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        archives: { count: 0, size: 0 },
        executables: { count: 0, size: 0 },
        others: { count: 0, size: 0 },
      },
    },
    operations: {
      classA: 0,
      classB: 0,
      period: '',
      configured: false,
    },
    cached: false,
  };

  const folderSet = new Set<string>();
  let cursor: string | undefined;

  try {
    // Fetch storage stats and operations stats in parallel
    const isS3Backend = typeof (BUCKET as any).fetchObject === "function" || (BUCKET as any)?.backend === "s3";
    const operationsPromise: Promise<OperationsStats> = isS3Backend
      ? Promise.resolve({ classA: 0, classB: 0, period: '', configured: false })
      : fetchOperationsStats(context.env);

    do {
      const listed = await BUCKET.list({
        cursor,
        limit: LIST_PAGE_SIZE,
        include: ['httpMetadata'],
      });

      for (const object of listed.objects) {
        // Skip internal files
        if (object.key.startsWith(`${INTERNAL_PREFIX}/`)) continue;
        if (object.key.endsWith(FOLDER_MARKER)) {
          // Count folder markers
          const folderPath = object.key.replace(FOLDER_MARKER, '');
          folderSet.add(folderPath);
          continue;
        }

        // Count files
        stats.storage.totalFiles++;
        stats.storage.totalSize += object.size;

        // Categorize by file type
        const fileType = getFileTypeFromMetadata(object.httpMetadata?.contentType, object.key);
        stats.storage.fileTypes[fileType].count++;
        stats.storage.fileTypes[fileType].size += object.size;

        // Extract folder from path
        const lastSlash = object.key.lastIndexOf('/');
        if (lastSlash > 0) {
          folderSet.add(object.key.substring(0, lastSlash + 1));
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    stats.storage.totalFolders = folderSet.size;

    // Wait for operations stats
    stats.operations = await operationsPromise;

    // Update cache
    statsCache.set(cacheKey, { data: stats, timestamp: Date.now() });

    return Response.json(stats, {
      headers: {
        'Cache-Control': forceRefresh ? 'no-store' : 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Stats calculation error:', error);
    return Response.json(
      { error: 'Failed to calculate stats' },
      { status: 500 }
    );
  }
};
