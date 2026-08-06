import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import schemas from "@/data/schema-data.json";
import listings from "@/data/listings.json";
import { cityFaq, cityName, localBlurb, type Listing } from "@/lib/city-content";

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
  const others = listings.filter((l) => l.slug !== listing.slug);
  const cn = cityName(listing);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        <Link to="/">
          <img
            src="/images/logo-vapespot.webp"
            alt="Vape Spot"
            className="h-10 w-auto object-contain"
          />
        </Link>

        <div className="w-full text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">
            {listing.cityTag}
          </p>
          <h1 className="text-[28px] font-bold text-[#0A0A0A] leading-tight">
            {listing.businessName}
          </h1>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#7C3AED]">
            {listing.category}
          </p>
        </div>

        <div className="w-full border-t border-[#F0F0F0]" />

        <div className="w-full space-y-2 text-[14px] text-[#0A0A0A]">
          {listing.address && (
            <p>{listing.address}</p>
          )}
          {listing.phone && (
            <p>{listing.phone}</p>
          )}
          {listing.hours && (
            <p>{listing.hours}</p>
          )}
        </div>

        <div className="w-full border-t border-[#F0F0F0]" />

        <p className="w-full text-[14px] text-[#9E9E9E] leading-relaxed">
          {listing.description}
        </p>

        <p className="w-full text-[14px] text-[#0A0A0A] leading-relaxed">
          {localBlurb(listing)}
        </p>

        <Link
          to="/"
          className="w-full inline-flex items-center justify-center bg-black text-white py-4 text-[15px] font-semibold rounded-none hover:bg-[#1a1a1a] transition-colors"
        >
          Discover the shop
        </Link>

        <div className="w-full border-t border-[#F0F0F0]" />

        {/* FAQ unique à la ville — contenu réellement différencié */}
        <section className="w-full space-y-3">
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">
            About {cn}
          </h2>
          {faq.map((f) => (
            <div key={f.q} className="space-y-1">
              <p className="text-[14px] font-semibold text-[#0A0A0A]">{f.q}</p>
              <p className="text-[13px] text-[#616161] leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        <div className="w-full border-t border-[#F0F0F0]" />

        {/* Maillage interne : liens vers les autres villes */}
        <section className="w-full space-y-3">
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">
            Other locations
          </h2>
          <p className="text-[13px] text-[#616161]">
            VapeSpot has stores across Australia. Find yours:
          </p>
          <div className="w-full flex flex-wrap gap-x-4 gap-y-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/${o.slug}`}
                className="text-[13px] font-medium text-[#7C3AED] hover:underline"
              >
                {o.businessName}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}