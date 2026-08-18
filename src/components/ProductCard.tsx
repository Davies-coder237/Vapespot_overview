import { Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice, onImageError, productCard } from "@/lib/data";
import { useMyList } from "@/lib/storage";
import { toast } from "sonner";
import { PACK_TIERS, packPrice } from "@/lib/packs";

export function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick?: () => void;
}) {
  const { add } = useMyList();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product.id, 1);
    toast.success(`${product.name} added to your list`);
  };

  return (
    <div className="w-full min-h-[260px] lg:h-full flex items-stretch border-t border-b border-gray-200 bg-[#F5F5F5]">
      {/* Image — LEFT */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        onClick={onClick}
        className="relative shrink-0 w-[150px] md:w-[180px] lg:w-[200px] flex items-center justify-center py-4 px-4"
      >
        <img
          src={productCard(product)}
          alt={product.name}
          loading="lazy"
          onError={onImageError}
          className="w-full h-full object-contain max-h-[200px]"
        />
        <span className="absolute top-1.5 left-1.5 z-10 h-[50px] w-[50px] rounded-full bg-[#5B3DF5] text-white flex flex-col items-center justify-center border-2 border-white shadow">
          <Boxes className="h-4 w-4" strokeWidth={2.25} />
          <span className="mt-0.5 text-[7px] font-extrabold tracking-widest leading-none">PACKS</span>
        </span>
      </Link>

      {/* Text + button — RIGHT */}
      <div className="flex-1 min-w-0 flex flex-col py-4 pr-4">
        {/* Vertically centred text block */}
        <div className="flex-1 flex items-center">
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            onClick={onClick}
            className="flex flex-col gap-1 lg:w-full"
          >
            {product.brand && (
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7C3AED]">
                {product.brand}
              </span>
            )}

            {product.series && (
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
                {product.series}
              </span>
            )}

            <span className="text-[16px] font-bold leading-snug text-black line-clamp-2 mt-0.5">
              {product.name}
            </span>

            {(() => {
              const UNITS = /(\d+)\s*(puffs|ml|mg|mah|mm|g|w|v|hz|nm|rpm|ohm|Ω|%|µg|µl)/i;
              const specLine = Object.values(product.specs)
                .filter((v) => UNITS.test(String(v)))
                .slice(0, 2)
                .join(", ");
              return specLine ? (
                <span className="text-[12px] text-[#9E9E9E] mt-0.5">{specLine}</span>
              ) : null;
            })()}

            <span className="mt-1 text-[18px] font-bold text-black">
              {formatPrice(product.price_aud)}
              <span className="ml-1 text-[12px] font-semibold text-[#9E9E9E]">AUD</span>
            </span>
            <span className="mt-0.5 text-[11px] font-semibold text-[#7C3AED]">
              🛵 30 min–2hr delivery
            </span>
          </Link>
        </div>

        {/* Pack badges — full width */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 px-2 md:px-3 mt-3">
          {PACK_TIERS.map((t) => {
            const price = packPrice(product.price_aud, t.qty);
            if (price == null) return null;
            const full = product.price_aud * t.qty;
            const pct = Math.round((1 - price / full) * 100);
            const save = Math.round(full - price);
            return (
              <button
                key={t.qty}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  add(product.id, t.qty);
                  toast.success(`${t.qty}-pack of ${product.name} added to your list`);
                }}
                className="relative flex flex-col items-start justify-between rounded-[14px] px-2.5 py-2 h-[90px] text-left text-white transition-transform duration-150 hover:-translate-y-0.5"
                style={{ background: "linear-gradient(180deg, #9670F5 0%, #5C36C9 100%)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)" }}
              >
                <span className="text-[12px] md:text-[13px] font-bold">PACK {t.qty}</span>
                <span className="absolute top-1.5 right-1.5 bg-white text-[#5C36C9] text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">-{pct}%</span>
                <span className="w-full text-[13px] md:text-[14px] font-bold">A${price}</span>
                <span className="w-full text-[9px] md:text-[10px] font-semibold text-white/80">SAVE A${save}</span>
              </button>
            );
          })}
        </div>

        {/* Button stays at bottom — single unit (×1) */}
        <button
          type="button"
          onClick={handleAdd}
          className="mt-2 w-full rounded-[10px] bg-black text-white text-[13px] font-semibold py-3 px-4 hover:opacity-90 transition-opacity"
        >
          Add to My List
        </button>
      </div>
    </div>
  );
}
