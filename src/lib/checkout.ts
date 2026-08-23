import { CRYPTO_DISCOUNT_PERCENT } from "./packs";

// Commande minimale (AUD) avant de pouvoir passer commande.
export const MIN_ORDER_AUD = 100;

export function cryptoDiscountAmount(price: number): number {
  return (price * CRYPTO_DISCOUNT_PERCENT) / 100;
}

/** Montant après réduction crypto / gift card. */
export function cryptoDiscounted(price: number): number {
  return price - cryptoDiscountAmount(price);
}