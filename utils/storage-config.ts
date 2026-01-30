export type StorageBackendType = "s3" | "r2" | "onedrive";

export type StorageS3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type StorageOneDriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId?: string;
  driveId?: string;
  rootPath?: string;
  chunkSize?: number;
};

export type StorageDriveConfig = {
  id: string;
  name?: string;
  backend: StorageBackendType;
  r2Binding?: string;
  s3?: StorageS3Config;
  onedrive?: StorageOneDriveConfig;
};

export type StorageConfigV1 = {
  version: 1;
  updatedAt: number;
  drives: StorageDriveConfig[];
};

export type StorageS3ConfigPublic = {
  endpoint: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  accessKeyIdPreview: string;
  hasSecretAccessKey: boolean;
};

export type StorageOneDriveConfigPublic = {
  tenantId?: string;
  driveId?: string;
  rootPath?: string;
  chunkSize?: number;
  clientIdPreview: string;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
};

export type StorageDriveConfigPublic = {
  id: string;
  name?: string;
  backend: StorageBackendType;
  r2Binding?: string;
  s3?: StorageS3ConfigPublic;
  onedrive?: StorageOneDriveConfigPublic;
};

export type StorageConfigPublicV1 = {
  version: 1;
  updatedAt: number;
  drives: StorageDriveConfigPublic[];
};

export const STORAGE_CONFIG_KEY = "config:storage";
const STORAGE_CONFIG_CACHE_TTL_MS = 5000;

let storageConfigCache:
  | {
      kv: KVNamespace;
      fetchedAt: number;
      value: StorageConfigV1 | null;
    }
  | null = null;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function normalizeRootPath(value: unknown): string {
  const raw = readString(value)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return raw;
}

export function normalizeDriveId(value: unknown): string {
  return readString(value).toLowerCase();
}

export function isValidDriveId(value: string): boolean {
  // 兼容大多数 DNS label（允许 _ 以兼容部分用户习惯）
  if (!value) return false;
  if (value.length > 63) return false;
  return /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/.test(value);
}

function maskSecret(value: string): string {
  const s = String(value || "");
  if (!s) return "";
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

export async function loadStorageConfig(kv: KVNamespace | undefined): Promise<StorageConfigV1 | null> {
  if (!kv || typeof kv.get !== "function") return null;
  if (storageConfigCache && storageConfigCache.kv === kv) {
    if (Date.now() - storageConfigCache.fetchedAt < STORAGE_CONFIG_CACHE_TTL_MS) {
      return storageConfigCache.value;
    }
  }
  try {
    const raw = await kv.get(STORAGE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.drives)) return null;
    const value = parsed as StorageConfigV1;
    storageConfigCache = { kv, fetchedAt: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

export async function saveStorageConfig(kv: KVNamespace, config: StorageConfigV1): Promise<void> {
  await kv.put(STORAGE_CONFIG_KEY, JSON.stringify(config));
  storageConfigCache = { kv, fetchedAt: Date.now(), value: config };
}

export function toPublicStorageConfig(config: StorageConfigV1 | null): StorageConfigPublicV1 {
  if (!config) {
    return { version: 1, updatedAt: 0, drives: [] };
  }

  const drives: StorageDriveConfigPublic[] = (config.drives || []).map((drive) => {
    const id = normalizeDriveId(drive.id);
    const name = readString(drive.name) || undefined;
    const backend = drive.backend;
    const r2Binding = readString(drive.r2Binding) || undefined;

    if (backend === "s3" && drive.s3) {
      return {
        id,
        name,
        backend,
        s3: {
          endpoint: readString(drive.s3.endpoint),
          bucket: readString(drive.s3.bucket),
          region: readString(drive.s3.region) || "auto",
          forcePathStyle: drive.s3.forcePathStyle !== false,
          accessKeyIdPreview: maskSecret(readString(drive.s3.accessKeyId)),
          hasSecretAccessKey: !!readString(drive.s3.secretAccessKey),
        },
      };
    }

    if (backend === "onedrive" && drive.onedrive) {
      return {
        id,
        name,
        backend,
        onedrive: {
          tenantId: readString(drive.onedrive.tenantId) || undefined,
          driveId: readString(drive.onedrive.driveId) || undefined,
          rootPath: normalizeRootPath(drive.onedrive.rootPath) || undefined,
          chunkSize: readNumber(drive.onedrive.chunkSize),
          clientIdPreview: maskSecret(readString(drive.onedrive.clientId)),
          hasClientSecret: !!readString(drive.onedrive.clientSecret),
          hasRefreshToken: !!readString(drive.onedrive.refreshToken),
        },
      };
    }

    return {
      id,
      name,
      backend,
      r2Binding,
    };
  });

  return {
    version: 1,
    updatedAt: Number.isFinite(config.updatedAt) ? config.updatedAt : 0,
    drives,
  };
}

export function validateAndNormalizeStorageConfigInput(
  raw: any,
  existing: StorageConfigV1 | null
): StorageConfigV1 {
  const drivesInput = raw?.drives;
  if (!Array.isArray(drivesInput)) {
    throw new Error("请求参数错误：drives 必须是数组");
  }

  const existingById = new Map<string, StorageDriveConfig>();
  for (const d of existing?.drives || []) {
    existingById.set(normalizeDriveId(d.id), d);
  }

  const drives: StorageDriveConfig[] = [];
  const seen = new Set<string>();

  for (const driveRaw of drivesInput) {
    if (!driveRaw || typeof driveRaw !== "object") {
      throw new Error("请求参数错误：drive 必须是对象");
    }

    const id = normalizeDriveId(driveRaw.id);
    if (!isValidDriveId(id)) {
      throw new Error(`Drive ID 不合法：${readString(driveRaw.id)}`);
    }
    if (seen.has(id)) {
      throw new Error(`Drive ID 重复：${id}`);
    }
    seen.add(id);

    const backend = readString(driveRaw.backend) as StorageBackendType;
    if (backend !== "s3" && backend !== "r2" && backend !== "onedrive") {
      throw new Error(`Drive ${id} 后端类型不合法：${readString(driveRaw.backend)}`);
    }

    const name = readString(driveRaw.name) || undefined;
    const existingDrive = existingById.get(id);

    if (backend === "r2") {
      const r2Binding = readString(driveRaw.r2Binding) || (existingDrive?.backend === "r2" ? readString(existingDrive.r2Binding) : "");
      drives.push({
        id,
        name,
        backend,
        r2Binding: r2Binding || undefined,
      });
      continue;
    }

    if (backend === "onedrive") {
      const onedriveRaw = driveRaw.onedrive || {};
      const existingOneDrive = existingDrive?.backend === "onedrive" ? existingDrive.onedrive : undefined;

      const clientId = readString(onedriveRaw.clientId) || readString(existingOneDrive?.clientId);
      if (!clientId) throw new Error(`Drive ${id} 缺少 OneDrive Client ID`);

      const clientSecret = readString(onedriveRaw.clientSecret) || readString(existingOneDrive?.clientSecret);
      if (!clientSecret) throw new Error(`Drive ${id} 缺少 OneDrive Client Secret`);

      const refreshToken = readString(onedriveRaw.refreshToken) || readString(existingOneDrive?.refreshToken);
      if (!refreshToken) throw new Error(`Drive ${id} 缺少 OneDrive Refresh Token`);

      const tenantId = readString(onedriveRaw.tenantId) || readString(existingOneDrive?.tenantId) || "common";
      const driveId = readString(onedriveRaw.driveId) || readString(existingOneDrive?.driveId) || "";
      const rootPath = normalizeRootPath(onedriveRaw.rootPath) || normalizeRootPath(existingOneDrive?.rootPath) || "";
      const chunkSize = readNumber(onedriveRaw.chunkSize) ?? readNumber(existingOneDrive?.chunkSize);

      drives.push({
        id,
        name,
        backend,
        onedrive: {
          clientId,
          clientSecret,
          refreshToken,
          tenantId,
          driveId: driveId || undefined,
          rootPath: rootPath || undefined,
          chunkSize,
        },
      });
      continue;
    }

    const s3Raw = driveRaw.s3 || {};
    const existingS3 = existingDrive?.backend === "s3" ? existingDrive.s3 : undefined;

    const endpoint = readString(s3Raw.endpoint) || readString(existingS3?.endpoint);
    if (!endpoint) throw new Error(`Drive ${id} 缺少 S3 Endpoint`);
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      throw new Error(`Drive ${id} 的 S3 Endpoint 格式不正确`);
    }
    if (!/^https?:$/.test(endpointUrl.protocol)) {
      throw new Error(`Drive ${id} 的 S3 Endpoint 协议必须是 http/https`);
    }

    const bucket = readString(s3Raw.bucket) || readString(existingS3?.bucket);
    if (!bucket) throw new Error(`Drive ${id} 缺少 S3 Bucket`);

    const region = readString(s3Raw.region) || readString(existingS3?.region) || "auto";

    const accessKeyId = readString(s3Raw.accessKeyId) || readString(existingS3?.accessKeyId);
    if (!accessKeyId) throw new Error(`Drive ${id} 缺少 S3 Access Key ID`);

    const secretAccessKey = readString(s3Raw.secretAccessKey) || readString(existingS3?.secretAccessKey);
    if (!secretAccessKey) throw new Error(`Drive ${id} 缺少 S3 Secret Access Key`);

    const forcePathStyle =
      readBoolean(s3Raw.forcePathStyle) ??
      (typeof existingS3?.forcePathStyle === "boolean" ? existingS3.forcePathStyle : true);

    drives.push({
      id,
      name,
      backend,
      s3: {
        endpoint: endpointUrl.toString(),
        bucket,
        region,
        accessKeyId,
        secretAccessKey,
        forcePathStyle,
      },
    });
  }

  return {
    version: 1,
    updatedAt: Date.now(),
    drives,
  };
}
