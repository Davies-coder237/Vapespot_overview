import { Link } from "@tanstack/react-router";

/**
 * Section d'accueil compacte : titre + texte + bouton vers /discover.
 * Style "plat" identique aux autres sections (Top Brands, Browse Categories) :
 * pas de carte ni de cadre, en-tete aligné à gauche + bouton noir du site.
 */
export function DiscoverCta() {
  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-black">
              Vape shops across Australia
            </h2>
            <p className="text-sm text-[#6E6E73]">
              100+ VapeSpot stores — find the nearest one, city by city.
            </p>
          </div>
          <Link
            to="/discover"
            className="inline-flex items-center justify-center bg-black text-white text-[13px] font-semibold rounded-none px-6 py-3 hover:opacity-90 transition-opacity"
          >
            Discover a store
          </Link>
        </div>
      </div>
    </section>
  );
}