import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Listing } from "@/lib/city-content";
import { cityName } from "@/lib/city-content";
import { CityCard, STATE_NAMES, STATE_ORDER, cityState } from "./CityCard";

/**
 * Store locator — le pattern standard des grands sites (McDonald's, banques…) :
 * recherche + filtre par État + grille de cartes villes responsive.
 * Chaque carte reste un lien interne vers /<slug> (maillage conservé).
 * Import différé du JSON pour ne pas alourdir le bundle initial.
 */
export function StoreLocator() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    let alive = true;
    import("@/data/listings.json").then(({ default: ls }) => {
      if (alive) setListings(ls);
    });
    return () => {
      alive = false;
    };
  }, []);

  const states = useMemo(() => {
    if (!listings) return [];
    const set = new Set<string>();
    listings.forEach((l) => set.add(cityState(l).code));
    return STATE_ORDER.filter((c) => set.has(c));
  }, [listings]);

  const groups = useMemo(() => {
    if (!listings) return null;
    const q = query.trim().toLowerCase();
    const inState = (l: Listing) => filter === "ALL" || cityState(l).code === filter;
    const matches = (l: Listing) =>
      !q ||
      cityName(l).toLowerCase().includes(q) ||
      l.businessName.toLowerCase().includes(q);
    const filtered = listings.filter((l) => inState(l) && matches(l));
    return STATE_ORDER.map((code) => ({
      code,
      items: filtered.filter((l) => cityState(l).code === code),
    })).filter((g) => g.items.length > 0);
  }, [listings, query, filter]);

  return (
    <div className="space-y-6">
      {/* Recherche + filtre */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city…"
            className="w-full h-11 pl-9 pr-3 rounded-none border border-[#E5E7EB] bg-white text-[14px] text-[#0A0A0A] placeholder:text-[#9E9E9E] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-colors ${
              filter === "ALL"
                ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                : "bg-white border-[#E5E7EB] text-[#6E6E73] hover:border-[#7C3AED]/50"
            }`}
          >
            All states
          </button>
          {states.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setFilter(code)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-colors ${
                filter === code
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                  : "bg-white border-[#E5E7EB] text-[#6E6E73] hover:border-[#7C3AED]/50"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de cartes groupée par État */}
      {groups === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[136px] bg-[#F0F0F0] animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-[14px] text-[#6E6E73] py-8 text-center">
          No delivery area matches “{query}”.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.code}>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7C3AED] mb-3">
              {STATE_NAMES[g.code] ?? g.code}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {g.items.map((l) => (
                <CityCard
                  key={l.slug}
                  slug={l.slug}
                  city={cityName(l)}
                  state={STATE_NAMES[g.code] ?? g.code}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}