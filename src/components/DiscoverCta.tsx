import { Link } from "@tanstack/react-router";

/**
 * Bandeau d'accueil compact : invite à découvrir la page /discover
 * qui liste toutes les villes. Remplace l'ancien listing de ~100 villes
 * directement sur la home (trop chargé visuellement).
 */
export function DiscoverCta() {
  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto w-full px-4">
        <div className="rounded-2xl bg-[#F6F4FF] border border-[#E5DFFF] px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-[22px] font-bold text-[#0A0A0A]">
              Vape shops across Australia
            </h2>
            <p className="text-[14px] text-[#6B7280] mt-1">
              100+ VapeSpot stores — find the nearest one, city by city.
            </p>
          </div>
          <Link
            to="/discover"
            className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#6D28D9] shrink-0"
          >
            Discover a store
          </Link>
        </div>
      </div>
    </section>
  );
}