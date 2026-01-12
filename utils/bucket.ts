import { S3BucketAdapter } from "@/utils/s3-bucket";
import { loadStorageConfig, normalizeDriveId } from "@/utils/storage-config";

export function notFound() {
  return new Response("Not found", { status: 404 });
}

function readEnvString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDriveIdForEnv(driveId: string): string {
  return String(driveId || "")
    .trim()
    .replace(/[^0-9a-zA-Z]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function isBucketLike(value: any): boolean {
  return (
    value &&
    typeof value === "object" &&
    typeof value.list === "function" &&
    typeof value.head === "function" &&
    typeof value.get === "function" &&
    typeof value.put === "function" &&
    typeof value.delete === "function"
  );
}

function resolveS3BucketForDrive(env: any, driveId: string): S3BucketAdapter | null {
  const driveKey = normalizeDriveIdForEnv(driveId);
  const prefix = driveKey ? `S3_${driveKey}_` : "";

  const endpointOverride = prefix ? readEnvString(env[`${prefix}ENDPOINT`]) : "";
  const bucketOverride = prefix ? readEnvString(env[`${prefix}BUCKET`]) : "";
  const accessKeyIdOverride = prefix ? readEnvString(env[`${prefix}ACCESS_KEY_ID`]) : "";
  const secretAccessKeyOverride = prefix ? readEnvString(env[`${prefix}SECRET_ACCESS_KEY`]) : "";
  const regionOverride = prefix ? readEnvString(env[`${prefix}REGION`]) : "";

  const hasDriveOverride =
    !!endpointOverride ||
    !!bucketOverride ||
    !!accessKeyIdOverride ||
    !!secretAccessKeyOverride ||
    !!regionOverride;

  if (!hasDriveOverride) return null;

  const endpoint = endpointOverride || readEnvString(env.S3_ENDPOINT);
  const bucket = bucketOverride || readEnvString(env.S3_BUCKET);
  const accessKeyId =
    accessKeyIdOverride || readEnvString(env.S3_ACCESS_KEY_ID) || readEnvString(env.AWS_ACCESS_KEY_ID);
  const secretAccessKey =
    secretAccessKeyOverride ||
    readEnvString(env.S3_SECRET_ACCESS_KEY) ||
    readEnvString(env.AWS_SECRET_ACCESS_KEY);
  const region = regionOverride || readEnvString(env.S3_REGION) || readEnvString(env.AWS_REGION) || "auto";

  const missing: string[] = [];
  if (!endpoint) missing.push(`${prefix}ENDPOINT`);
  if (!bucket) missing.push(`${prefix}BUCKET`);
  if (!accessKeyId) missing.push(`${prefix}ACCESS_KEY_ID`);
  if (!secretAccessKey) missing.push(`${prefix}SECRET_ACCESS_KEY`);
  if (missing.length > 0) {
    throw new Error(`S3 多配置未完整：缺少 ${missing.join(", ")}`);
  }

  return new S3BucketAdapter({
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
  });
}

function resolveDefaultS3Bucket(env: any): S3BucketAdapter | null {
  const endpoint = readEnvString(env.S3_ENDPOINT);
  const bucket = readEnvString(env.S3_BUCKET);
  const accessKeyId = readEnvString(env.S3_ACCESS_KEY_ID) || readEnvString(env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = readEnvString(env.S3_SECRET_ACCESS_KEY) || readEnvString(env.AWS_SECRET_ACCESS_KEY);
  const region = readEnvString(env.S3_REGION) || readEnvString(env.AWS_REGION) || "auto";

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return new S3BucketAdapter({ endpoint, bucket, accessKeyId, secretAccessKey, region });
}

export async function parseBucketPath(context): Promise<[any, string]> {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const pathSegments = ((params && params.path) || []) as String[];
  const path = decodeURIComponent(pathSegments.join("/"));
  const driveid = normalizeDriveId(url.hostname.replace(/\..*/, ""));

  // 0) KV（网页）配置优先：config:storage
  const kvConfig = await loadStorageConfig(env?.ossShares);
  const kvDrive = kvConfig?.drives?.find((d) => normalizeDriveId(d?.id) === driveid);
  if (kvDrive) {
    if (kvDrive.backend === "s3") {
      const s3 = kvDrive.s3;
      if (!s3) throw new Error(`Drive ${driveid} S3 配置缺失`);
      return [
        new S3BucketAdapter({
          endpoint: s3.endpoint,
          bucket: s3.bucket,
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
          region: s3.region,
          forcePathStyle: s3.forcePathStyle,
        }),
        path,
      ];
    }

    if (kvDrive.backend === "r2") {
      const bindingName = readEnvString(kvDrive.r2Binding) || driveid;
      const bucketCandidate = env[bindingName];
      if (isBucketLike(bucketCandidate)) return [bucketCandidate, path];
      throw new Error(`Drive ${driveid} R2 绑定未配置：${bindingName}`);
    }
  }

  // 1) driveid 级别的 S3 配置（S3_<DRIVEID>_*）
  const driveS3 = resolveS3BucketForDrive(env, driveid);
  if (driveS3) return [driveS3, path];

  // 2) driveid 对应的 R2 绑定（与原逻辑兼容）
  const driveBucket = env[driveid];
  if (isBucketLike(driveBucket)) return [driveBucket, path];

  // 3) 默认 S3 配置（S3_*）
  const defaultS3 = resolveDefaultS3Bucket(env);
  if (defaultS3) return [defaultS3, path];

  // 4) 默认 BUCKET
  return [env["BUCKET"], path];
}
