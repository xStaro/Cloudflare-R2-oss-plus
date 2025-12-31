interface Env {
  BUCKET: R2Bucket;
  // Optional: for R2 operations analytics
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  R2_BUCKET_NAME?: string;
}

interface FileTypeStats {
  count: number;
  size: number;
}

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
      others: FileTypeStats;
    };
  };
  operations: OperationsStats;
  cached: boolean;
  cachedAt?: string;
}

// Simple in-memory cache (will reset on cold start)
let statsCache: { data: StatsResponse; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

function getFileType(contentType: string): 'images' | 'videos' | 'documents' | 'others' {
  if (contentType.startsWith('image/')) return 'images';
  if (contentType.startsWith('video/')) return 'videos';
  if (
    contentType.startsWith('application/pdf') ||
    contentType.startsWith('application/msword') ||
    contentType.startsWith('application/vnd.') ||
    contentType.startsWith('text/')
  ) {
    return 'documents';
  }
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

  // Calculate date range (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  // Build GraphQL query
  const query = `
    query GetR2Operations($accountTag: String!, $startDate: Date!, $endDate: Date!, $bucketName: String) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2OperationsAdaptiveGroups(
            filter: {
              datetime_geq: $startDate
              datetime_lt: $endDate
              ${R2_BUCKET_NAME ? 'bucketName: $bucketName' : ''}
            }
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

  const variables: Record<string, string> = {
    accountTag: CF_ACCOUNT_ID,
    startDate,
    endDate,
  };

  if (R2_BUCKET_NAME) {
    variables.bucketName = R2_BUCKET_NAME;
  }

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
      console.error('Analytics API error:', response.status, await response.text());
      return { classA: 0, classB: 0, period: `${startDate} - ${endDate}`, configured: true };
    }

    const data = await response.json() as any;

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return { classA: 0, classB: 0, period: `${startDate} - ${endDate}`, configured: true };
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
      period: `${startDate} - ${endDate}`,
      configured: true,
    };
  } catch (error) {
    console.error('Failed to fetch operations stats:', error);
    return { classA: 0, classB: 0, period: `${startDate} - ${endDate}`, configured: true };
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { BUCKET } = context.env;

  // Check cache
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
    return Response.json({
      ...statsCache.data,
      cached: true,
      cachedAt: new Date(statsCache.timestamp).toISOString(),
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
    const operationsPromise = fetchOperationsStats(context.env);

    do {
      const listed = await BUCKET.list({
        cursor,
        limit: 1000,
      });

      for (const object of listed.objects) {
        // Skip internal files
        if (object.key.startsWith('_$flaredrive$/')) continue;
        if (object.key.endsWith('_$folder$')) {
          // Count folder markers
          const folderPath = object.key.replace('_$folder$', '');
          folderSet.add(folderPath);
          continue;
        }

        // Count files
        stats.storage.totalFiles++;
        stats.storage.totalSize += object.size;

        // Categorize by file type
        const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
        const fileType = getFileType(contentType);
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
    statsCache = {
      data: stats,
      timestamp: Date.now(),
    };

    return Response.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=60',
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
