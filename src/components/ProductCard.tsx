import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/types";
import { formatPrice, onImageError, productCard } from "@/lib/data";
import { useMyList } from "@/lib/storage";
import { toast } from "sonner";

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
