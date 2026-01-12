import { isAdminUserAsync } from "@/utils/auth";
import {
  loadStorageConfig,
  saveStorageConfig,
  toPublicStorageConfig,
  validateAndNormalizeStorageConfigInput,
} from "@/utils/storage-config";

interface Env {
  ossShares: KVNamespace;
  [key: string]: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminUserAsync(context);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "需要管理员权限" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!context.env.ossShares || typeof context.env.ossShares.get !== "function") {
    return new Response(JSON.stringify({ error: "KV(ossShares) 未绑定，无法读取存储配置" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config = await loadStorageConfig(context.env.ossShares);
  return new Response(JSON.stringify({ config: toPublicStorageConfig(config) }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminUserAsync(context);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "需要管理员权限" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!context.env.ossShares || typeof context.env.ossShares.put !== "function") {
    return new Response(JSON.stringify({ error: "KV(ossShares) 未绑定，无法保存存储配置" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const existing = await loadStorageConfig(context.env.ossShares);
    const next = validateAndNormalizeStorageConfigInput(body, existing);
    await saveStorageConfig(context.env.ossShares, next);
    return new Response(JSON.stringify({ success: true, config: toPublicStorageConfig(next) }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "保存失败" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
