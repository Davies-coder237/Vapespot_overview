import { useState } from "react";
import reviews from "@/data/reviews.json";

/**
 * Bloc « What our customers say » — widget avis des fiches produit, inspiré du
 * panneau « Reviews tab » de worbimed/steroidskaufen (Judge.me) : UN BANDEAU
 * RÉSUMÉ cliquable (note moyenne + étoiles + nb d'avis) et, AU CLIC, les avis
 * se DÉROULENT en dessous (accordéon). Fini le défilement permanent des cartes.
 *
 * ⚠️ RÈGLE STRICTE : les étoiles sont du VISUEL (SVG), JAMAIS de balisage
 * schema.org Review / aggregateRating (Google interdit les rich snippets
 * d'avis pour les produits de vapotage). Pour Google, le seo-block du
 * prerender reste en texte seul (inchangé).
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

  const [open, setOpen] = useState(false);
  const avg =
    Math.round((mine.reduce((s, r) => s + r.rating, 0) / mine.length) * 10) /
    10;
  const verifiedCount = mine.filter((r) => r.verified).length;

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
        </header>

        {/*
         * Bandeau résumé cliquable (miroir du panneau Judge.me) : note
         * moyenne + étoiles + compteur à gauche, chevron à droite.
         * `aria-expanded`/`aria-controls` pour l'accessibilité, puis le
         * panneau se déroule ou se referme au clic.
         */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="product-reviews-panel"
          className="w-full flex items-center justify-between gap-3 border border-[#E5E7EB] bg-white rounded-[12px] px-4 py-3.5 text-left hover:bg-[#F5F5F7] transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} filled={i <= Math.round(avg)} />
              ))}
            </span>
            <span className="text-[15px] font-semibold text-black">
              {avg}/5 — {mine.length}{" "}
              {mine.length === 1 ? "review" : "reviews"}
              <span className="text-[#9E9E9E]">
                {" "}
                · {verifiedCount} verified
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`text-[13px] font-semibold text-[#6B7280] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            {open ? "Hide " : "Show all"} ▾
          </span>
        </button>

        {/*
         * Panneau d'avis : masqué quand replié, apparaît (glisse vers le
         * haut + fondu) quand ouvert. Le contenu reste identique aux cartes
         * existantes ; seul le comportement « au clic » change.
         */}
        <div
          id="product-reviews-panel"
          role="region"
          aria-label="Customer reviews"
          className={
            open
              ? "grid gap-5 md:grid-cols-2 lg:grid-cols-3 reviews-panel-in"
              : "hidden"
          }
        >
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