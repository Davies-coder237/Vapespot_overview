// Géocodage nominatim + sélection d'entrepôt le plus proche (serveur uniquement).
// - Nominatim exige un User-Agent explicite, sinon « Access denied ».
// - Limite 1 requête/s → cache des résultats dans KV VAPESPOT_GEO_CACHE (30 jours).
// - La page de suivi NE re-géocode jamais : lat/lng sont stockés sur la commande.
// - Seuls les entrepôts ACTIFS sont éligibles (Broome/Kalgoorlie = fermés).
import warehousesData from "./warehouses.json";

export interface Warehouse {
  id: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lng: number;
  active: boolean;
}

export const ALL_WAREHOUSES: Warehouse[] = warehousesData.warehouses;
export const ACTIVE_WAREHOUSES: Warehouse[] = ALL_WAREHOUSES.filter((w) => w.active);

const UA = "VapeSpotAnalytics/1.0 (info@vapespot.store)";
const GEO_TTL = 60 * 60 * 24 * 30; // 30 jours

/** Hash FNV-1a — clé de cache stable pour une adresse. */
function hashAddress(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "g:" + (h & 0x7fffffff).toString(16).padStart(8, "0");
}

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Géocode une adresse de livraison (cache KV puis Nominatim). Ne lancer qu'au
 * checkout — jamais depuis la page de suivi (anti-enumération + 1 req/s).
 */
export async function geocodeAddress(env: any, address: string): Promise<GeoResult> {
  const key = hashAddress(address.trim().toLowerCase());
  const cached = await env.VAPESPOT_GEO_CACHE.get(key, "json");
  if (cached) return cached as GeoResult;

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=" +
    encodeURIComponent(address);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (res.status !== 200) throw new Error("geo_unavailable"); // 403 = UA refusé / limit

  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!rows || rows.length === 0) throw new Error("geo_not_found");

  const out: GeoResult = {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    label: rows[0].display_name,
  };
  await env.VAPESPOT_GEO_CACHE.put(key, JSON.stringify(out), { expirationTtl: GEO_TTL });
  return out;
}

/** Distance haversine en km. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Entrepôt actif le plus proche (haversine) — choix stocké sur la commande. */
export function nearestActiveWarehouse(lat: number, lng: number) {
  let best: Warehouse | null = null;
  let bestKm = Infinity;
  for (const w of ACTIVE_WAREHOUSES) {
    const km = haversineKm(lat, lng, w.lat, w.lng);
    if (km < bestKm) {
      bestKm = km;
      best = w;
    }
  }
  return { warehouse: best, distanceKm: bestKm };
}