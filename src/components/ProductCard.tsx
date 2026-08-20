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
    <div className="w-full min-h-[380px] lg:h-full flex items-stretch border-t border-b border-gray-200 bg-[#F5F5F5]">
      {/* Image — LEFT */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        onClick={onClick}
        className="shrink-0 w-[150px] md:w-[180px] lg:w-[200px] flex items-center justify-center py-4 px-4"
      >
        <img
          src={productCard(product)}
          alt={product.name}
          loading="lazy"
          onError={onImageError}
          className="w-full h-full object-contain max-h-[200px]"
        />
      </Link>

      {/* Text + packs + button — RIGHT */}
      <div className="flex-1 min-w-0 flex flex-col py-4 pr-4">
        {/* Vertically centred text + pack badges */}
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

            <span translate="no" className="mt-1 text-[18px] font-bold text-black">
              {formatPrice(product.price_aud)}
              <span className="ml-1 text-[12px] font-semibold text-[#9E9E9E]">AUD</span>
            </span>
            <span className="mt-0.5 text-[11px] font-semibold text-[#7C3AED]">
              🛵 30 min–2hr delivery
            </span>

            {/* Pack savings — pastille + grille 2×2 de chips */}
            <div className="mt-2 space-y-1.5">
              <span className="inline-flex items-center rounded-full bg-[#EDE9FF] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#5B3DF5]">
                Pack savings
              </span>
              <div className="grid grid-cols-2 gap-1 w-full">
                {PACK_TIERS.map((t) => {
                  const price = packPrice(product.price_aud, t.qty);
                  if (price == null) return null;
                  const pct = Math.round((1 - t.multiplier) * 100);
                  return (
                    <span
                      key={t.qty}
                      translate="no"
                      className="inline-flex min-w-0 items-center gap-1 rounded-md border border-[#DDD6FF] bg-white px-1.5 py-1 text-[9px] font-bold text-[#1F1F1F] whitespace-nowrap"
                    >
                      <span>Pack {t.qty}</span>
                      <span className="text-[#5B3DF5]">A${price}</span>
                      <span className="text-[#5B3DF5]">-{pct}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </Link>
        </div>

        {/* Button stays at bottom */}
        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 w-full lg:w-[220px] bg-black text-white text-[13px] font-semibold rounded-none py-3 px-4 hover:opacity-90 transition-opacity"
        >
          Add to My List
        </button>
      </div>
    </div>
  );
}