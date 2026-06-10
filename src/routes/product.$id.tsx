import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { findProduct } from "@/lib/data";
import type { Product } from "@/lib/types";
import { ProductDetails } from "@/components/ProductDetails";


export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  notFoundComponent: () => <div className="p-8 text-center">Product not found.</div>,
});

function ProductPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    findProduct(id).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Vape Spot`;
    }
    return () => {
      document.title = "Vape Spot — Premium Vape Catalogue";
    };
  }, [product]);

  if (loading) return <div className="p-8 text-center text-[#6E6E73]">Loading…</div>;
  if (!product) throw notFound();

  return (
    <div>
      <ProductDetails product={product} />
    </div>
  );
}
