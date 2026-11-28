// Modèle de données partagé des Pages Functions (Étapes 1 → 4, validées 20/11).
// Statuts : pending_payment → paid → at_warehouse → in_transit → delivered
// (+ delivery_failed / expired, en attente de décision).
export const MIN_ORDER_AUD = 150;            // même seuil que src/lib/checkout.ts
export const PAYMENT_WINDOW_MIN = 30;        // fenêtre de paiement avant expiration
export const INSURANCE_AUD = 300;            // caution coursier — affichée UNIQUEMENT dans l'email ④

export const STATUS = {
  pending: "pending_payment",
  paid: "paid",
  atWarehouse: "at_warehouse",
  inTransit: "in_transit",
  delivered: "delivered",
  deliveryFailed: "delivery_failed",
  expired: "expired",
  cancelled: "cancelled",
} as const;

export type DeliveryMethod = "courier" | "australia_post";

/** Route RÉELLE (calculée côté serveur via OSRM, jamais à la volée sur /track). */
export interface RouteInfo {
  geometry: Array<[number, number]>; // [[lng, lat], …] — tracé sur les vraies routes
  km: number;                        // distance routière réelle
  durationSec: number;               // durée de conduite réaliste (OSRM)
}

export interface OrderItem {
  productId: string;
  quantity: number;
  name: string;
  priceAud: number;
}

export interface Order {
  id: string;                          // numéro VS-0001
  email: string;
  clientId: string | null;             // clé du chat (getClientId) — permet le bouton « ↩️ Reply » sur les notifs
  visitorLabel: string | null;         // « Visitor 3568 » du navigateur — continuité reconnue par l'admin
  customerName: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  items: OrderItem[];
  totalAud: number;
  status: string;
  warehouseId: string | null;
  warehouseCity: string | null;
  lat: number | null;                  // géocodé côté serveur (jamais re-géocodé côté client)
  lng: number | null;
  route: RouteInfo | null;             // tracé routier réel (calculé au checkout, jamais sur /track)
  paymentMethod: string | null;        // payid | bank | crypto | gift_card
  driverLink: string | null;
  insuranceAmount: number;             // éditable en admin ; ne sort QUE dans l'email ④
  notes: string;
  createdAt: string;                   // ISO
  updatedAt: string;
  paymentInstructionsSentAt: string | null; // quand l'email ② a été envoyé = DÉPART de la fenêtre
  expireAt: string | null;             // null tant que ② NON envoyé (aucune limite avant l'email) ;
                                       // défini = paymentInstructionsSentAt + 30 min
}