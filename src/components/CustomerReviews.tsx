import reviews from "@/data/reviews.json";

/**
 * Bloc « What our customers say » — les avis sont affichés en TEXTE uniquement
 * (jamais de balisage schema étoiles : Google interdit les rich snippets d'avis
 * pour les produits de vapotage). Le produit peut ne pas avoir d'avis → section
 * masquée (return null).
 */
export function CustomerReviews({ productId }: { productId: string }) {
  const mine = reviews.filter((r) => r.productId === productId);
  if (mine.length === 0) return null;

  return (
    <section
      className="w-full max-w-6xl mx-auto my-10 px-4 md:px-6"
      aria-label="Customer reviews"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-3xl font-bold text-black tracking-tight">
            What our customers say
          </h2>
          <p className="text-[15px] text-[#9E9E9E]">
            Real feedback from verified orders across Australia.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((r) => (
            <article
              key={r.id}
              className="border border-[#E8E8E8] bg-white rounded-none p-5 flex flex-col gap-2.5"
            >
              <p className="text-[15px] text-[#1F1F1F] leading-snug">{r.text}</p>
              <footer className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-black">
                  — {r.author}
                  {r.verified && (
                    <span className="text-[11px] font-medium text-[#7C3AED]">
                      Verified order
                    </span>
                  )}
                </p>
                <p translate="no" className="text-[12px] text-[#9E9E9E]">
                  {r.city} · {r.date} · {r.rating}/5
                </p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}