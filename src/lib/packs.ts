// Pack pricing — dérivé du modèle client : unit 54.99 → ×2 = $100, ×3 = $130,
// ×5 = $200, ×10 = $350 (arrondis à l'entier AUD). Le multiplicateur est appliqué
// à n'importe quel produit, puis le total du pack est arrondi à l'entier.
// Le prix unitaire, lui, garde ses décimales.

export const CRYPTO_DISCOUNT_PERCENT = 10;

export interface PackTier {
  qty: number;
  multiplier: number;
}

// multiplier = prixPACK / (54.99 × qty)
export const PACK_TIERS: PackTier[] = [
  { qty: 2, multiplier: 0.90925622840516457 },
  { qty: 3, multiplier: 0.78802570103655213 },
  { qty: 5, multiplier: 0.72740498272413165 },
  { qty: 10, multiplier: 0.6364793598836152 },
];

/**
 * Prix d'une quantité donnée :
 * - qty <= 1             → prix unitaire (décimales conservées)
 * - qty dans un pack     → total du pack, arrondi à l'entier AUD
 * - autre quantité (>1)  → prix plein unitaire × qty (aucun pack défini)
 */
export function packPrice(unitPrice: number | null, qty: number): number | null {
  if (unitPrice == null) return null;
  if (qty <= 1) return unitPrice;
  const tier = PACK_TIERS.find((t) => t.qty === qty);
  if (!tier) return unitPrice * qty;
  return Math.round(unitPrice * qty * tier.multiplier);
}

export interface PackOption {
  qty: number;
  price: number | null;
  save: number | null; // économie vs prix plein (null pour ×1)
  bestValue: boolean;
}

/** Liste complète : ×1 + tous les packs, avec l'économie cumulée et le "best value". */
export function packOptions(unitPrice: number | null): PackOption[] {
  const tiers: PackOption[] = PACK_TIERS.map((t) => {
    const price = packPrice(unitPrice, t.qty);
    const save =
      unitPrice == null || price == null
        ? null
        : Math.round((unitPrice * t.qty - price) * 100) / 100;
    return { qty: t.qty, price, save, bestValue: false };
  });

  const best = tiers.reduce<PackOption | null>((m, t) =>
    t.save != null && (m == null || t.save > m.save!) ? t : m,
  null);
  if (best) best.bestValue = true;

  return [{ qty: 1, price: unitPrice, save: null, bestValue: false }, ...tiers];
}