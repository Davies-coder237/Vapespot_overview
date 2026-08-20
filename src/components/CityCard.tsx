import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cityName, type Listing } from "@/lib/city-content";

/** Noms complets des États — utilisés pour le groupage du store locator. */
export const STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
  ACT: "Australian Capital Territory",
};

export const STATE_ORDER = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

/** Extrait l'abréviation d'État du cityTag ("Sydney CBD NSW" -> "NSW"). */
export function cityState(listing: Listing): { code: string; name: string } {
  const m = listing.cityTag.match(/ ([A-Z]{2,3})$/);
  const code = m ? m[1] : "";
  return { code, name: STATE_NAMES[code] ?? code };
}

/**
 * Carte ville à l'identité du site (angles droits, accent violet, chevron).
 * Utilisée dans le store locator (/discover) et le carrousel de la page produit.
 */
export function CityCard({
  slug,
  city,
  state,
}: {
  slug: string;
  city: string;
  state: string;
}) {
  return (
    <Link
      to={`/${slug}`}
      className="group flex flex-col justify-between gap-3 border border-[#E5E7EB] bg-white p-5 min-h-[136px] hover:border-[#7C3AED]/50 hover:shadow-sm transition-colors"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C3AED]">
        Vape Spot
      </span>

      <span className="space-y-1">
        <span className="block text-[17px] font-bold text-black leading-tight">
          {city}
        </span>
        <span className="block text-[12px] text-[#9E9E9E]">{state}</span>
      </span>

      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7C3AED] group-hover:underline">
        We deliver here <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </span>
    </Link>
  );
}