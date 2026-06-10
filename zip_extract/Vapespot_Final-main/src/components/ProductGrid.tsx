import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  onProductClick,
}: {
  products: Product[];
  onProductClick?: (id: string) => void;
}) {
  if (products.length === 0) {
    return <p className="text-[#6E6E73] px-4">No products found.</p>;
  }
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onClick={onProductClick ? () => onProductClick(p.id) : undefined}
        />
      ))}
    </div>
  );
}
