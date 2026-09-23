import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import brands from "@/data/brands.json";

type Model = {
  id: string;
  name: string;
  series: string;
  price_aud: number;
  puffs: number;
  rechargeable: boolean;
  img: string;
};

type GridItem = {
  id: string;
  name: string;
  price_aud: number;
  img: string;
};

function findBrand(slug: string) {
  return brands.brands.find((b) => b.slug === slug);
}

export const Route = createFileRoute("/brands/$slug")({
  component: BrandPage,
  head: ({ match }) => {
    const { slug } = match.params;
    const b = findBrand(slug);
    if (!b) return {};
    return {
      meta: [
        { title: `${b.title} | Vape Spot Australia` },
        { name: "description", content: b.metaDescription },
        { property: "og:title", content: b.title },
        { property: "og:description", content: b.metaDescription },
        { property: "og:url", content: `https://vapespot.store/brands/${b.slug}/` },
      ],
    };
  },
});

function BrandPage() {
  const { slug } = Route.useParams();
  const b = findBrand(slug);
  if (!b) throw notFound();

  const [data, setData] = useState<{ models: Model[]; grid: GridItem[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/brand-products.json")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData({ models: json?.[slug]?.models ?? [], grid: json?.[slug]?.grid ?? [] });
      })
      .catch(() => {
        if (!cancelled) setData({ models: [], grid: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const showTable = (data?.models ?? []).slice(0, 8);
  const showGrid = data?.grid ?? [];
  const fmt = (n: number) => (n ? n.toLocaleString("en-AU") : "—");

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-10 space-y-8">
        <header className="space-y-3">
          <Link
            to="/brands"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#7C3AED] hover:underline"
          >
            <span aria-hidden>←</span> All brands
          </Link>
          <h1 className="text-[26px] md:text-[36px] font-bold text-[#0A0A0A] leading-tight">
            {b.name} Australia
          </h1>
        </header>

        {(b.intro || []).map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-[#3F3F46]">
            {p}
          </p>
        ))}

        {/* Tableau comparatif */}
        {data === null ? (
          <div className="border border-[#E5E7EB] p-4 space-y-2 animate-pulse">
            <div className="h-4 w-48 bg-[#EEE] rounded" />
            <div className="h-8 bg-[#F5F5F5] rounded" />
          </div>
        ) : showTable.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              Compare {b.name} models
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] md:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-[#6E6E73] text-[12px] uppercase tracking-wide">
                    <th className="py-2 pr-3 font-semibold">Device</th>
                    <th className="py-2 pr-3 font-semibold">Puffs</th>
                    <th className="py-2 pr-3 font-semibold">Price (AUD)</th>
                    <th className="py-2 pr-3 font-semibold">A$ per 1,000 puffs</th>
                    <th className="py-2 font-semibold">Rechargeable</th>
                  </tr>
                </thead>
                <tbody>
                  {showTable.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        <Link
                          to="/product/$id"
                          params={{ id: m.id }}
                          className="font-semibold text-[#0A0A0A] hover:text-[#7C3AED]"
                        >
                          {m.series}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-[#3F3F46]">{fmt(m.puffs)}</td>
                      <td className="py-2 pr-3 text-[#3F3F46]">A${m.price_aud.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-[#3F3F46]">
                        {m.puffs > 0 ? `A$${(m.price_aud / m.puffs * 1000).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2 text-[#3F3F46]">{m.rechargeable ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Grille produits */}
        {showGrid.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              Shop popular {b.name} products
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {showGrid.map((m) => (
                <Link
                  key={m.id}
                  to="/product/$id"
                  params={{ id: m.id }}
                  className="flex flex-col items-center gap-2 border border-[#E5E7EB] p-3 text-center hover:border-[#7C3AED]/50 transition-colors"
                >
                  <img
                    src={m.img}
                    alt={m.name}
                    loading="lazy"
                    className="h-24 w-24 object-contain bg-[#FAFAFA]"
                  />
                  <span className="text-[13px] font-semibold leading-snug text-[#0A0A0A] line-clamp-2">
                    {m.name}
                  </span>
                  <span className="text-[13px] font-bold text-[#7C3AED]">A${m.price_aud.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {b.faq.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A]">
              Frequently asked questions about {b.name}
            </h2>
            {b.faq.map((f, i) => (
              <details key={i} className="group border border-[#E5E7EB] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-[#0A0A0A]">
                  {f.q}
                  <span className="text-[#9E9E9E] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-[#3F3F46]">{f.a}</p>
              </details>
            ))}
          </section>
        )}

        {/* CTA */}
        <div className="border border-[#F0EEFF] bg-[#F0EEFF]/60 p-6 space-y-3">
          <h2 className="text-[18px] font-bold text-[#0A0A0A]">
            Shop all {b.name} vapes at Vape Spot
          </h2>
          <p className="text-[15px] text-[#3F3F46]">
            Order {b.name} online with fast courier delivery across Australia —
            usually within 30 minutes to 2 hours in metro areas.
          </p>
          <Link
            to="/brands"
            className="inline-flex items-center justify-center rounded-none bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Browse all brands
          </Link>
        </div>
      </div>
    </div>
  );
}