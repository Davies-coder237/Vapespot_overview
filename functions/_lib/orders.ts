// Stockage des commandes dans KV VAPESPOT_ORDERS.
// Clé : order:<id> (VS-XXXX). ⚠️ Plus AUCUN TTL physique : une commande n'est
// JAMAIS supprimée automatiquement — sinon l'admin perd des commandes arrivées
// pendant son sommeil. La fenêtre de paiement de 30 min (expireAt) n'existe que
// APRÈS l'envoi de l'email ② (reservation client) et reste un état SOFT (badge),
// jamais une suppression. Les entrées restent manipulables par l'admin.
import type { Order } from "./types";
import { PAYMENT_WINDOW_MIN } from "./types";

export const ORDER_PREFIX = "order:";

export function orderKey(id: string): string {
  return ORDER_PREFIX + id;
}

/** Crée une commande pending_payment — AUCUNE fenêtre tant que ② n'est pas envoyé. */
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
  route?: Order["route"] | null;   // tracé routier réel (OSRM) calculé au checkout
}): Order {
  const now = new Date().toISOString();
  return {
    ...input,
    status: "pending_payment",
    paymentMethod: null,
    driverLink: null,
    route: null,                        // rempli après géocodage (OSRM) — jamais sur /track
    insuranceAmount: 300, // caution coursier — visible UNIQUEMENT dans l'email ④
    notes: "",
    createdAt: now,
    updatedAt: now,
    paymentInstructionsSentAt: null, // fenêtre 30 min NON démarrée
    expireAt: null,
  };
}

/** Écrit une commande — PERMANENTE (aucun TTL, plus jamais de perte). */
export async function putOrder(env: any, order: Order): Promise<void> {
  await env.VAPESPOT_ORDERS.put(orderKey(order.id), JSON.stringify(order));
}

export async function getOrder(env: any, id: string): Promise<Order | null> {
  return (await env.VAPESPOT_ORDERS.get(orderKey(id), "json")) as Order | null;
}

/** Supprime définitivement une commande — action MANUELLE de l'admin uniquement
 *  (bouton "Delete" dans la page admin). Aucun TTL, aucun compte à rebours :
 *  l'admin décide quand une commande ne sert plus à rien. */
export async function deleteOrder(env: any, id: string): Promise<void> {
  await env.VAPESPOT_ORDERS.delete(orderKey(id));
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

/** Fenêtre de paiement EXPIRÉE ? Seulement si ② a été envoyé ET l'heure passée.
 *  Tant que l'email de paiement n'a pas été envoyé : JAMAIS expirée. */
export function isExpiredOrder(order: Order): boolean {
  if (order.status !== "pending_payment") return false;
  if (!order.paymentInstructionsSentAt || !order.expireAt) return false;
  return Date.now() > new Date(order.expireAt).getTime();
}

/** Met à jour updatedAt + statut et réécrit. */
export async function setStatus(env: any, order: Order, status: string): Promise<Order> {
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await putOrder(env, order);
  return order;
}