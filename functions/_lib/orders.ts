// Stockage des commandes dans KV VAPESPOT_ORDERS.
// Clé : order:<id> (VS-XXXX). Une commande en attente de paiement expire après
// 30 min : on pose un expirationTtl au put (nettoyage physique) + le statut
// expire_at pour le check-on-read (il ne faut jamais servir une commande
// expirée comme valide, et on déclenche l'email + bot de « commande expirée »).
import type { Order } from "./types";
import { PAYMENT_WINDOW_MIN } from "./types";

export const ORDER_PREFIX = "order:";

export function orderKey(id: string): string {
  return ORDER_PREFIX + id;
}

/** Crée une commande pending_payment avec fenêtre de paiement 30 min. */
export function newPendingOrder(input: {
  id: string;
  email: string;
  customerName: string;
  deliveryAddress: string;
  deliveryMethod: "courier" | "australia_post";
  items: Order["items"];
  totalAud: number;
  warehouseId: string;
  warehouseCity: string;
  lat: number;
  lng: number;
}): Order {
  const now = Date.now();
  return {
    ...input,
    status: "pending_payment",
    paymentMethod: null,
    driverLink: null,
    insuranceAmount: 300, // caution coursier — visible UNIQUEMENT dans l'email ④
    notes: "",
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expireAt: new Date(now + PAYMENT_WINDOW_MIN * 60_000).toISOString(),
  };
}

/** Écrit une commande (TTL 30 min tant qu'en pending_payment, sinon permanent). */
export async function putOrder(env: any, order: Order): Promise<void> {
  const ttlSec = order.status === "pending_payment" ? PAYMENT_WINDOW_MIN * 60 : undefined;
  await env.VAPESPOT_ORDERS.put(orderKey(order.id), JSON.stringify(order), {
    expirationTtl: ttlSec,
  });
}

export async function getOrder(env: any, id: string): Promise<Order | null> {
  return (await env.VAPESPOT_ORDERS.get(orderKey(id), "json")) as Order | null;
}

/** Liste toutes les commandes (récentes d'abord). */
export async function listOrders(env: any): Promise<Order[]> {
  const out: Order[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await env.VAPESPOT_ORDERS.list({ prefix: ORDER_PREFIX, cursor });
    for (const k of page.keys) {
      const o = await env.VAPESPOT_ORDERS.get(k.name, "json");
      if (o) out.push(o as Order);
    }
    if (!page.list_complete) cursor = page.cursor;
    else break;
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Commande expirée ? (pending_payment + heure passée) — check-on-read. */
export function isExpiredOrder(order: Order): boolean {
  return order.status === "pending_payment" && Date.now() > new Date(order.expireAt).getTime();
}

/** Met à jour updatedAt + statut et réécrit. */
export async function setStatus(env: any, order: Order, status: string): Promise<Order> {
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await putOrder(env, order);
  return order;
}