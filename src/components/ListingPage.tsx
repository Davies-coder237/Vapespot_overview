import { Link } from "@tanstack/react-router";

interface Listing {
  slug: string;
  businessName: string;
  category: string;
  cityTag: string;
  address?: string;
  phone?: string;
  hours?: string;
  description: string;
}

interface ListingPageProps {
  listing: Listing;
}

export function ListingPage({ listing }: ListingPageProps) {
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

        <Link
          to="/"
          className="w-full inline-flex items-center justify-center bg-black text-white py-4 text-[15px] font-semibold rounded-none hover:bg-[#1a1a1a] transition-colors"
        >
          Discover the shop
        </Link>
      </div>
    </div>
  );
}
