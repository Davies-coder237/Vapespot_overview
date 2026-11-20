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
} as const;

export type DeliveryMethod = "courier" | "australia_post";

export interface OrderItem {
  productId: string;
  quantity: number;
  name: string;
  priceAud: number;
}

export interface Order {
  id: string;                          // numéro VS-0001
  email: string;
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
  paymentMethod: string | null;        // payid | bank | crypto | gift_card
  driverLink: string | null;
  insuranceAmount: number;             // éditable en admin ; ne sort QUE dans l'email ④
  notes: string;
  createdAt: string;                   // ISO
  updatedAt: string;
  expireAt: string;                    // createdAt + 30 min
}