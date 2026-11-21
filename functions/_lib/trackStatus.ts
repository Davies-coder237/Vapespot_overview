// Frise de statut de la page /track — étapes fixes validées 20/11.
// `orderStatusIndex` : position d'un statut commande dans la frise (0..4).
//   -1 = hors frise (delivery_failed / expired) → la frise reste toute grise,
//   le bloc notes rend un message explicite.
// `isValidOrderStatus` : vrai si le statut appartient à la frise.

export const TRACK_STEPS: string[] = [
  "pending_payment", // Order received
  "paid",            // Payment confirmed
  "at_warehouse",    // In our warehouse
  "in_transit",      // On the way
  "delivered",       // Delivered
];

export function orderStatusIndex(status: string): number {
  return TRACK_STEPS.indexOf(status);
}

export function isValidOrderStatus(status: string): boolean {
  return orderStatusIndex(status) >= 0;
}