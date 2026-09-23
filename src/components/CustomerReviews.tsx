import reviews from "@/data/reviews.json";

/**
 * Bloc « What our customers say » — rendu visuel inspiré du widget avis de
 * worbimed.com (Trustindex) : cartes à fond gris clair radius 12px, avatar
 * ROND AVEC PHOTO (ou initiales en repli), nom en semi-bold, rangée d'étoiles
 * dorées + badge « Verified order », puis le texte de l'avis.
 *
 * ⚠️ RÈGLE STRICTE : les étoiles sont du VISUEL (SVG), JAMAIS du balisage
 * schema.org Review / aggregateRating (Google interdit les rich snippets
 * d'avis pour les produits de vapotage). Pour Google, le seo-block du
 * prerender reste en texte seul.
 */
function initials(name: string) {
  const parts = name.replace(".", "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

const STAR_POINTS =
  "12,1.5 14.5,8.6 22.0,8.8 16.0,13.3 18.2,20.5 12,16.2 5.8,20.5 8.0,13.3 2.0,8.8 9.5,8.6";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points={STAR_POINTS} fill={filled ? "#F7B731" : "#E5E7EB"} />
    </svg>
  );
}

export function CustomerReviews({ productId }: { productId: string }) {
  const mine = reviews.filter((r) => r.productId === productId);
  if (mine.length === 0) return null;

  // 1 avis → carte d'une largeur de colonne, alignée À GAUCHE (pas de carte
  // orpheline centrée) ; 2 → deux colonnes ; 3+ → grille 3 colonnes
  const wrap =
    mine.length === 1
      ? "md:grid-cols-2 lg:grid-cols-3"
      : mine.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-3";

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

        <div className={`grid gap-5 ${wrap}`}>
          {mine.map((r) => (
            <article
              key={r.id}
              className="flex flex-col gap-4 border border-[#F4F4F4] bg-[#F4F4F4] rounded-[12px] p-5"
            >
              {/* En-tête : avatar (photo ou initiales en repli) + nom + ville/date */}
              <header className="flex items-center gap-3">
                {r.avatar ? (
                  <img
                    src={r.avatar}
                    alt={r.author}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    translate="no"
                    className="shrink-0 h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span
                    translate="no"
                    className="shrink-0 h-10 w-10 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[13px] font-bold text-[#4B5563]"
                  >
                    {initials(r.author)}
                  </span>
                )}
                <div className="min-w-0">
                  <p translate="no" className="text-[15px] font-semibold text-black truncate">
                    {r.author}
                  </p>
                  <p translate="no" className="text-[13px] text-[#6B7280]">
                    {r.city} · {r.date}
                  </p>
                </div>
              </header>

              {/* Étoiles (visuel uniquement) + score + badge vérifié */}
              <div className="flex items-center flex-wrap gap-x-1 gap-y-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} filled={i <= r.rating} />
                ))}
                <span translate="no" className="text-[13px] text-[#6B7280]">
                  {r.rating}/5
                </span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E7F3B] rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    ✓&nbsp;Verified order
                  </span>
                )}
              </div>

              {/* Texte de l'avis */}
              <p className="text-[15px] text-[#1F1F1F] leading-[1.5]">{r.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}