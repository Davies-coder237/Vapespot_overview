import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Send } from "lucide-react";
import { findProduct, formatPrice, onImageError, productCard } from "@/lib/data";
import { useMyList } from "@/lib/storage";
import type { Product } from "@/lib/types";
import { buildTelegramMessage, buildTelegramUrl, buildOrderLines } from "@/lib/telegram";

export function MyList() {
  const { items, setQuantity, remove } = useMyList();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(items.map((i) => findProduct(i.productId))).then((list) => {
      if (!cancelled) setProducts(list.filter((p): p is Product => p !== null));
    });
    return () => { cancelled = true; };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <p className="text-[#6E6E73]">Your list is empty.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center bg-black text-white rounded-none px-5 py-3 font-semibold"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const lines = items
    .map((i) => ({ item: i, product: products.find((p) => p.id === i.productId) }))
    .filter((l) => l.product) as { item: { productId: string; quantity: number }; product: Product }[];

  const orderLines = buildOrderLines(items, products);
  const url = buildTelegramUrl(buildTelegramMessage(orderLines));

  return (
    <div className="pb-6 lg:max-w-4xl lg:mx-auto">
      {/* Cards — same design as ProductCard across the site */}
      <div className="flex flex-col gap-3">
        {lines.map(({ item, product }) => {
          return (
            <div
              key={product.id}
              className="w-full min-h-[260px] lg:min-h-[200px] flex items-stretch border-t border-b border-gray-200 bg-[#F5F5F5]"
            >
              {/* Image — LEFT */}
              <Link
                to="/product/$id"
                params={{ id: product.id }}
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

              {/* Text + controls — RIGHT */}
              <div className="flex-1 min-w-0 flex flex-col py-4 pr-4">
                {/* Vertically centred text block */}
                <div className="flex-1 flex items-center">
                  <Link
                    to="/product/$id"
                    params={{ id: product.id }}
                    className="flex flex-col gap-1"
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
                    <span className="text-[16px] lg:text-[20px] font-bold leading-snug text-black line-clamp-2 mt-0.5">
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

                    <span className="mt-1 text-[18px] lg:text-[22px] font-bold text-black">
                      {formatPrice(product.price_aud)}
                      <span className="ml-1 text-[12px] font-semibold text-[#9E9E9E]">AUD</span>
                    </span>
                  </Link>
                </div>

                {/* Quantity selector */}
                <div className="mt-2 inline-flex items-center border border-[#D0D0D0] self-start">
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, Math.max(1, item.quantity - 1))}
                    aria-label="Decrease"
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#E8E8E8] transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 h-8 flex items-center justify-center text-[14px] font-semibold border-x border-[#D0D0D0]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, item.quantity + 1)}
                    aria-label="Increase"
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#E8E8E8] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  className="mt-2 w-full bg-black text-white text-[13px] font-semibold rounded-none py-3 px-4 hover:opacity-90 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order CTA */}
      <div className="px-4 mt-6 space-y-2">
        <p className="text-center text-[13px] md:text-sm font-semibold text-[#7C3AED] mb-1">
          🛵 Hand-delivered by local courier, usually 30 min–2hrs — or via Australia Post.
        </p>
        <Link
          to="/order-summary"
          className="w-full inline-flex items-center justify-center gap-2 bg-black text-white rounded-none py-5 text-[16px] font-bold hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
          Contact us on Telegram
        </Link>
        <p className="text-center text-xs text-[#9E9E9E]">
          Review your order before sending.
        </p>
      </div>
    </div>
  );
}
