import { Link } from "@tanstack/react-router";
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
    <div className="w-full min-h-[280px] lg:h-full flex flex-col border-t border-b border-gray-200 bg-[#F5F5F5] pb-6">
      {/* Image + Text row */}
      <div className="flex-1 flex items-stretch">
        {/* Image — LEFT */}
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          onClick={onClick}
          className="shrink-0 w-[150px] md:w-[180px] lg:w-[200px] flex items-center justify-center px-4"
        >
          <img
            src={productCard(product)}
            alt={product.name}
            loading="lazy"
            onError={onImageError}
            className="w-full h-full object-contain max-h-[200px]"
          />
        </Link>

        {/* Text — RIGHT */}
        <div className="flex-1 min-w-0 flex flex-col py-4 pr-4">
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
      </div>

      {/* Pack badges — single horizontal line */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 px-2 sm:px-4 mt-4">
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
              className="relative flex flex-col items-start justify-between rounded-[14px] px-1.5 sm:px-2.5 py-2 h-[84px] sm:h-[90px] text-left text-white transition-transform duration-150 hover:-translate-y-0.5"
              style={{ background: "linear-gradient(180deg, #9670F5 0%, #5C36C9 100%)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)" }}
            >
              {/* Percentage badge (top-right) */}
              <span className="absolute top-1.5 right-1.5 bg-white text-[#5C36C9] text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded leading-none">-{pct}%</span>

              {/* PACK text (left-aligned, under percentage) */}
              <span className="mt-2 text-[11px] sm:text-[12px] md:text-[13px] font-bold">PACK {t.qty}</span>

              {/* Price (left-aligned) */}
              <span className="mt-2 w-full text-[12px] sm:text-[13px] md:text-[14px] font-bold">A${price}</span>

              {/* Save text (left-aligned) */}
              <span className="mt-2 w-full truncate text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-white/80">SAVE A${save}</span>
            </button>
          );
        })}
      </div>

      {/* Button — centered, rectangular, straight borders */}
      <button
        type="button"
        onClick={handleAdd}
        className="mx-auto mt-6 w-[calc(100%-3rem)] max-w-xs rounded-none px-4 py-3 bg-black text-white text-[13px] font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        Add to My List
      </button>
    </div>
  );
}
