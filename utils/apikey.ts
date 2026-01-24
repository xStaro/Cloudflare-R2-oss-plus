// ==================== API Key 工具函数 ====================

// ==================== 类型定义 ====================
export interface ApiKey {
  id: string;              // 唯一ID
  name: string;            // 密钥名称（如：PicGo、备份脚本）
  key: string;             // 实际密钥 (sk-xxx 格式)
  permissions: string[];   // 权限列表 ['*'] 或 ['/uploads', '/images']
  isReadonly: boolean;     // 是否只读
  createdAt: number;       // 创建时间戳
  expiresAt: number | null;// 过期时间（null=永久）
  lastUsed: number | null; // 最后使用时间
  createdBy: string;       // 创建者用户名
  enabled: boolean;        // 是否启用
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export interface ApiKeyAuthResult {
  authenticated: boolean;
  username?: string;
  permissions?: string[];
  isAdmin?: boolean;
  isReadonly?: boolean;
  isApiKey?: boolean;
  apiKeyId?: string;
  apiKeyName?: string;
}

// ==================== 常量 ====================
const API_KEY_PREFIX = 'sk-';
const API_KEY_STORAGE_PREFIX = 'apikey:';
const API_KEY_LIST_KEY = 'apikey:_list';

// ==================== 工具函数 ====================

/**
 * 生成随机 API Key
 * 格式: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32位随机字符)
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = API_KEY_PREFIX;
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * 检查是否为 API Key 格式
 */
export function isApiKeyFormat(key: string): boolean {
  return key && key.startsWith(API_KEY_PREFIX) && key.length === 35; // sk- + 32 chars
}

/**
 * 从请求头中提取 API Key
 */
export function extractApiKeyFromHeaders(headers: Headers): string | null {
  // 优先检查 X-API-Key 头
  const xApiKey = headers.get('X-API-Key');
  if (xApiKey && isApiKeyFormat(xApiKey)) {
    return xApiKey;
  }

  // 检查 Authorization: Bearer 头
  const authHeader = headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    if (isApiKeyFormat(token)) {
      return token;
    }
  }

  return null;
}

/**
 * 从 KV 获取所有 API Key ID 列表
 */
export async function getApiKeyList(kv: KVNamespace): Promise<string[]> {
  try {
    const listStr = await kv.get(API_KEY_LIST_KEY);
    if (!listStr) return [];
    return JSON.parse(listStr);
  } catch {
    return [];
  }
}

/**
 * 保存 API Key ID 列表到 KV
 */
async function saveApiKeyList(kv: KVNamespace, list: string[]): Promise<void> {
  await kv.put(API_KEY_LIST_KEY, JSON.stringify(list));
}

/**
 * 从 KV 获取单个 API Key
 */
export async function getApiKeyById(kv: KVNamespace, id: string): Promise<ApiKey | null> {
  try {
    const data = await kv.get(`${API_KEY_STORAGE_PREFIX}${id}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 通过密钥值查找 API Key
 */
export async function getApiKeyByKey(kv: KVNamespace, key: string): Promise<ApiKey | null> {
  const list = await getApiKeyList(kv);
  for (const id of list) {
    const apiKey = await getApiKeyById(kv, id);
    if (apiKey && apiKey.key === key) {
      return apiKey;
    }
  }
  return null;
}

/**
 * 获取所有 API Keys
 */
export async function getAllApiKeys(kv: KVNamespace): Promise<ApiKey[]> {
  const list = await getApiKeyList(kv);
  const keys: ApiKey[] = [];
  for (const id of list) {
    const apiKey = await getApiKeyById(kv, id);
    if (apiKey) {
      keys.push(apiKey);
    }
  }
  return keys;
}

/**
 * 创建新的 API Key
 */
export async function createApiKey(
  kv: KVNamespace,
  data: {
    name: string;
    permissions: string[];
    isReadonly: boolean;
    expiresAt: number | null;
    createdBy: string;
  }
): Promise<ApiKey> {
  const id = generateId();
  const key = generateApiKey();

  const apiKey: ApiKey = {
    id,
    name: data.name,
    key,
    permissions: data.permissions,
    isReadonly: data.isReadonly,
    createdAt: Date.now(),
    expiresAt: data.expiresAt,
    lastUsed: null,
    createdBy: data.createdBy,
    enabled: true,
  };

  // 保存 API Key
  await kv.put(`${API_KEY_STORAGE_PREFIX}${id}`, JSON.stringify(apiKey));

  // 更新列表
  const list = await getApiKeyList(kv);
  list.push(id);
  await saveApiKeyList(kv, list);

  return apiKey;
}

/**
 * 更新 API Key
 */
export async function updateApiKey(
  kv: KVNamespace,
  id: string,
  updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'isReadonly' | 'expiresAt' | 'enabled'>>
): Promise<ApiKey | null> {
  const apiKey = await getApiKeyById(kv, id);
  if (!apiKey) return null;

  // 应用更新
  const updatedKey: ApiKey = {
    ...apiKey,
    ...updates,
  };

  await kv.put(`${API_KEY_STORAGE_PREFIX}${id}`, JSON.stringify(updatedKey));
  return updatedKey;
}

/**
 * 删除 API Key
 */
export async function deleteApiKey(kv: KVNamespace, id: string): Promise<boolean> {
  const apiKey = await getApiKeyById(kv, id);
  if (!apiKey) return false;

  // 删除数据
  await kv.delete(`${API_KEY_STORAGE_PREFIX}${id}`);

  // 更新列表
  const list = await getApiKeyList(kv);
  const newList = list.filter(item => item !== id);
  await saveApiKeyList(kv, newList);

  return true;
}

/**
 * 更新 API Key 最后使用时间
 */
export async function updateApiKeyLastUsed(kv: KVNamespace, id: string): Promise<void> {
  const apiKey = await getApiKeyById(kv, id);
  if (apiKey) {
    apiKey.lastUsed = Date.now();
    await kv.put(`${API_KEY_STORAGE_PREFIX}${id}`, JSON.stringify(apiKey));
  }
}

/**
 * 验证 API Key
 */
export async function validateApiKey(kv: KVNamespace, key: string): Promise<ApiKeyValidationResult> {
  // 检查格式
  if (!isApiKeyFormat(key)) {
    return { valid: false, error: 'Invalid API Key format' };
  }

  // 查找 API Key
  const apiKey = await getApiKeyByKey(kv, key);
  if (!apiKey) {
    return { valid: false, error: 'API Key not found' };
  }

  // 检查是否启用
  if (!apiKey.enabled) {
    return { valid: false, error: 'API Key is disabled' };
  }

  // 检查是否过期
  if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
    return { valid: false, error: 'API Key has expired' };
  }

  return { valid: true, apiKey };
}

/**
 * 使用 API Key 进行认证
 */
export async function authenticateWithApiKey(kv: KVNamespace, key: string): Promise<ApiKeyAuthResult> {
  const result = await validateApiKey(kv, key);

  if (!result.valid || !result.apiKey) {
    return { authenticated: false };
  }

  const apiKey = result.apiKey;
  const isAdmin = apiKey.permissions.includes('*');

  // 异步更新最后使用时间（不等待，但记录错误）
  updateApiKeyLastUsed(kv, apiKey.id).catch((err) => {
    console.error(`Failed to update API Key last used time (id: ${apiKey.id}):`, err);
  });

  return {
    authenticated: true,
    username: `apikey:${apiKey.name}`,
    permissions: apiKey.permissions,
    isAdmin,
    isReadonly: apiKey.isReadonly,
    isApiKey: true,
    apiKeyId: apiKey.id,
    apiKeyName: apiKey.name,
  };
}

/**
 * 标准化路径，防止路径遍历攻击
 */
function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')           // 统一路径分隔符
    .replace(/\/+/g, '/')          // 合并多个斜杠
    .replace(/^\//, '')            // 移除开头斜杠
    .replace(/\/$/, '');           // 移除结尾斜杠
}

/**
 * 检查路径是否安全（不包含路径遍历字符）
 */
function isPathSafe(path: string): boolean {
  // 检查是否包含危险字符
  if (path.includes('..') || path.includes('\0')) {
    return false;
  }
  return true;
}

/**
 * 检查 API Key 是否有路径权限
 */
export function checkApiKeyPathPermission(apiKey: ApiKey, path: string): boolean {
  // 安全检查
  if (!isPathSafe(path)) {
    return false;
  }

  const normalizedPath = normalizePath(path);

  for (const perm of apiKey.permissions) {
    const trimmed = perm.trim();
    if (trimmed === '*') {
      return true;
    }

    const normalizedPerm = normalizePath(trimmed);

    // 精确匹配或前缀匹配（确保是目录边界）
    if (normalizedPath === normalizedPerm ||
        normalizedPath.startsWith(normalizedPerm + '/')) {
      return true;
    }
  }
  return false;
}

/**
 * 格式化 API Key 用于显示（隐藏中间部分）
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return key;
  return key.substring(0, 7) + '...' + key.substring(key.length - 4);
}
