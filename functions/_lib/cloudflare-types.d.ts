// Shim de types pour `cloudflare:workers` — présent uniquement au runtime
// Cloudflare. Ce fichier n'est PAS bundleé par Wrangler (préfixe _) : il sert
// au typecheck local (tsc --resolveJsonModule sur le dossier functions/).
declare module "cloudflare:workers" {
  export class DurableObject<TEnv = unknown> {
    protected readonly ctx: {
      storage: {
        get<V>(key: string): Promise<V | null>;
        put(key: string, value: unknown, options?: { expirationTtl?: number }): Promise<void>;
      };
    };
  }

  export interface KVNamespace {
    get(key: string, type?: "text" | "json"): Promise<string | unknown | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    list(options?: { prefix?: string; cursor?: string }): Promise<{
      keys: Array<{ name: string }>;
      list_complete: boolean;
      cursor: string;
    }>;
  }

  export interface DurableObjectNamespace<T> {
    idFromName(name: string): string;
    get(id: string): T;
  }
}