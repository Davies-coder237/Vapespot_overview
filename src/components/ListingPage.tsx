import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import schemas from "@/data/schema-data.json";
import listings from "@/data/listings.json";
import { cityFaq, cityName, localBlurb, type Listing } from "@/lib/city-content";
import { CityProducts } from "./CityProducts";
import { STATE_NAMES, STATE_ORDER, cityState } from "./CityCard";

interface ListingPageProps {
  listing: Listing;
}

export function ListingPage({ listing }: ListingPageProps) {
  useEffect(() => {
    const entry = schemas.find((s) => s.slug === listing.slug);
    if (!entry) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = `schema-${listing.slug}`;
    script.textContent = JSON.stringify(entry.schema);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [listing.slug]);

  const faq = cityFaq(listing);
  const cn = cityName(listing);

  // Autres villes groupées par État (compact, en colonnes sur desktop).
  const groups = useMemo(() => {
    const byState = new Map<string, Listing[]>();
    listings.forEach((l) => {
      if (l.slug === listing.slug) return;
      const { code } = cityState(l);
      if (!byState.has(code)) byState.set(code, []);
      byState.get(code)!.push(l);
    });
    return STATE_ORDER.map((code) => ({ code, items: byState.get(code) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [listing.slug]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-10 md:py-14">
        {/* Header */}
        <header className="text-center space-y-4 md:space-y-5 max-w-xl mx-auto">
          <Link to="/" className="inline-block">
            <img
              src="/images/logo-vapespot.webp"
              alt="Vape Spot"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">
              {listing.cityTag}
            </p>
            <h1 className="text-[28px] md:text-[34px] font-bold text-[#0A0A0A] leading-tight">
              {listing.businessName}
            </h1>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-[#7C3AED]">
              {listing.category}
            </p>
          </div>
        </header>

        <div className="mt-8 border-t border-[#F0F0F0]" />

        {/* Infos + description — 2 colonnes sur ordi, pleine largeur mobile */}
        <section className="py-8 md:py-10 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="space-y-5">
            <div className="space-y-2 text-[14px] text-[#0A0A0A]">
              {listing.address && <p>{listing.address}</p>}
              {listing.phone && <p>{listing.phone}</p>}
              {listing.hours && <p>{listing.hours}</p>}
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full md:w-auto md:px-8 bg-black text-white py-4 text-[15px] font-semibold rounded-none hover:bg-[#1a1a1a] transition-colors"
            >
              Discover the shop
            </Link>
          </div>

          <div className="space-y-4">
            <p className="text-[14px] text-[#9E9E9E] leading-relaxed">
              {listing.description}
            </p>
            <p className="text-[14px] text-[#0A0A0A] leading-relaxed">
              {localBlurb(listing)}
            </p>
          </div>
        </section>

        <div className="border-t border-[#F0F0F0]" />

        {/* FAQ unique à la ville — 2 colonnes sur ordi */}
        <section className="py-8 md:py-10">
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">About {cn}</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-x-10">
            {faq.map((f) => (
              <div key={f.q} className="space-y-1">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">{f.q}</p>
                <p className="text-[13px] text-[#616161] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-[#F0F0F0]" />

        {/* Produits populaires de la ville — vraies cartes + scroll horizontal */}
        <CityProducts slug={listing.slug} title={`Popular vape products in ${cn}`} />

        <div className="border-t border-[#F0F0F0] mt-8" />

        {/* Autres villes, groupées par État (maillage interne) */}
        <section className="py-8 md:py-10">
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">Other locations</h2>
          <p className="text-[13px] text-[#616161] mt-1">
            VapeSpot has stores across Australia. Find yours:
          </p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((g) => (
              <div key={g.code}>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
                  {STATE_NAMES[g.code] ?? g.code}
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {g.items.map((o) => (
                    <li key={o.slug}>
                      <Link
                        to={`/${o.slug}`}
                        className="text-[13px] text-[#0A0A0A] hover:text-[#7C3AED] hover:underline"
                      >
                        {cityName(o)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}