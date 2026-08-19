// Pack pricing — dérivé du modèle client : unit 54.99 → ×2 = $100, ×3 = $130,
// ×5 = $200, ×10 = $350 (arrondis à l'entier AUD). Le multiplicateur est appliqué
// à n'importe quel produit, puis le total du pack est arrondi à l'entier.
// Le prix unitaire, lui, garde ses décimales.

export const CRYPTO_DISCOUNT_PERCENT = 15;

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

/** true si qty est un palier de pack exact (×2, ×3, ×5, ×10). */
export function isPackQty(qty: number): boolean {
  return PACK_TIERS.some((t) => t.qty === qty);
}

/** Prix d'un morceau unique : 1 unité simple ou exactement un pack (arrondi entier AUD). */
function packOf(unitPrice: number, qty: number): number {
  const tier = PACK_TIERS.find((t) => t.qty === qty);
  if (!tier) return unitPrice;
  return Math.round(unitPrice * qty * tier.multiplier);
}

/**
 * Remise ("multiplier") d'un pack VIRTUEL pour une quantité intermédiaire
 * (ex. ×4, ×6, ×7, ×8, ×9) : la remise est interpolée linéairement entre les
 * deux paliers réels qui encadrent la quantité. Retourne null si la quantité
 * n'est pas éligible (≤×1, palier exact, ou au-delà du dernier palier ×10).
 */
function virtualLevelMultiplier(qty: number): number | null {
  const maxTier = PACK_TIERS[PACK_TIERS.length - 1].qty;
  if (qty <= 1 || qty >= maxTier || isPackQty(qty)) return null;

  let lower: PackTier | null = null;
  let upper: PackTier | null = null;
  for (const t of PACK_TIERS) {
    if (t.qty < qty) lower = t;
    else if (t.qty > qty) {
      upper = t;
      break;
    }
  }
  if (!lower || !upper) return null;

  const t = (qty - lower.qty) / (upper.qty - lower.qty);
  return lower.multiplier + t * (upper.multiplier - lower.multiplier);
}

/**
 * Prix d'une quantité donnée, TOUJOURS sur la base des packs :
 * - qty <= 1          → prix unitaire (décimales conservées)
 * - qty = 2/3/5/10    → prix exact du pack (inchangé)
 * - qty intermédiaire → le MEILLEUR prix entre la composition optimale des packs
 *                       réels (ex. 4 = 3-pack + 1) et le pack "virtuel" interpolé :
 *                       le client profite de la remise du pack même pour une
 *                       quantité non affichée sur le site (ex. ×4, ×6, ×7, ×8, ×9).
 * - qty > 10          → composition optimale des packs réels, sans extension de remise.
 */
export function packPrice(unitPrice: number | null, qty: number): number | null {
  if (unitPrice == null) return null;
  if (qty <= 1) return unitPrice;

  // Prog. dynamique ascendante : coût minimal pour atteindre EXACTEMENT q unités.
  const memo = new Map<number, number>([[0, 0]]);
  for (let q = 1; q <= qty; q++) {
    let best = Number.POSITIVE_INFINITY;
    for (const piece of [1, ...PACK_TIERS.map((t) => t.qty)]) {
      if (piece > q) continue;
      const candidate = memo.get(q - piece)! + packOf(unitPrice, piece);
      if (candidate < best) best = candidate;
    }
    memo.set(q, best);
  }
  const composed = memo.get(qty)!;

  // Pack "virtuel" : la remise du pack s'applique aussi aux quantités intermédiaires.
  const multiplier = virtualLevelMultiplier(qty);
  if (multiplier != null) {
    const virtual = Math.round(unitPrice * qty * multiplier);
    return Math.min(composed, virtual);
  }
  return composed;
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