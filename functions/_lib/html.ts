// Utilitaire HTML — échappement (réutilisé par les templates email).
export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Format monétaire en A$ : entier → sans virgule ("A$195"), décimal → 2 décimales.
 *  Le total des commandes est arrondi EN EXCÈS (Math.ceil) au checkout → entier.
 *  Les lignes produits gardent leurs centimes (prix du catalogue inchangés). */
export function fmtAud(n: number): string {
  return Number.isInteger(n) ? `A$${n}` : `A$${n.toFixed(2)}`;
}