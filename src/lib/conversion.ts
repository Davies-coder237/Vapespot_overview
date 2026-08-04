import { getClickId } from "./storage";

const POPCASH_AID = "503934";

/**
 * Conversion Tracker PopCash — fire & forget, sans backend.
 * On déclenche le postback quand un visiteur atteint une étape clé :
 *   type=1 : la page panier (order-summary) — micro-conversion
 *   type=2 : le clic "Contact us on Telegram" — tentative de commande
 * Ne s'active que si le visiteur vient d'une pub PopCash (clickid présent) —
 * les visiteurs organiques ne sont pas comptés.
 */
export function trackPopcashConversion(type: 1 | 2) {
  const clickId = getClickId();
  if (!clickId) return;
  const url = `https://ct.popcash.net/click?aid=${POPCASH_AID}&type=${type}&clickid=${encodeURIComponent(clickId)}`;
  // Image fantôme : pas de blocage CORS, pas de backend nécessaire.
  new Image().src = url;
}
