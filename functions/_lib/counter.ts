// Compteur atomique des numéros de commande (VS-XXXX).
// KV n'a pas d'incrément atomique → Durable Object : `next()` est garanti
// sans collision entre deux commandes simultanées. Configuré dans wrangler.toml
// (durable_objects + migrations) et lié comme env.ORDER_COUNTER.
import { DurableObject } from "cloudflare:workers";

export class OrderCounter extends DurableObject {
  async next(): Promise<number> {
    const raw = await this.ctx.storage.get<number>("n");
    const n = (raw ?? 0) + 1;
    await this.ctx.storage.put("n", n);
    return n;
  }
}

/** Formate un entier en numéro de commande VS-XXXX. */
export function orderNumber(n: number): string {
  return "VS-" + String(n).padStart(4, "0");
}