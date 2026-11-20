// Formatage des numéros de commande (VS-XXXX).
// Le compteur atomique lui-même vit dans le Worker dédié vapespot-orders-do
// (dossier local do-worker/, non commité) — Pages y accède via le binding
// Durable Object env.ORDER_COUNTER (script_name = "vapespot-orders-do").

/** Formate un entier en numéro de commande VS-XXXX. */
export function orderNumber(n: number): string {
  return "VS-" + String(n).padStart(4, "0");
}