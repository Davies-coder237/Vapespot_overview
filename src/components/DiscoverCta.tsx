import { Link } from "@tanstack/react-router";

/**
 * Bandeau Discover — carte violette pleine largeur, de bord en bord de l'écran
 * (comme la section Réassurance juste en dessous), SANS bord arrondi.
 * Typographie calquée sur Réassurance : titres 15->18px, sous-titres 13->15px,
 * qui grandissent avec l'écran (mobile -> tablette/PC).
 */
export function DiscoverCta() {
  return (
    <section className="w-full bg-[#F0EEFF]">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[15px] lg:text-[18px] font-bold text-black leading-tight">
            VapeSpot delivery across Australia
          </h2>
          <p className="text-[13px] lg:text-[15px] text-[#6E6E73] mt-1 leading-snug">
            We deliver to 100+ areas across the country — order from anywhere in your city.
          </p>
        </div>
        <Link
          to="/discover"
          className="inline-flex items-center justify-center bg-black text-white text-[13px] font-semibold rounded-none px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Discover delivery areas
        </Link>
      </div>
    </section>
  );
}