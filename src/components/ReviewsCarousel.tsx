import reviews from "@/data/reviews.json";

/**
 * Carrousel « What our customers say » de la HOMEPAGE — les 200 avis du site
 * en défilement horizontal INFINI (boucle CSS translateX(-50%) sur 2 groupes
 * identiques → aucun saut quand on revient au début).
 *
 * ⚠️ RÈGLE STRICTE (idem CustomerReviews) : les étoiles sont du VISUEL (SVG),
 * JAMAIS de balisage schema.org Review / aggregateRating (Google interdit les
 * rich snippets d'avis pour le vapotage). Pour Google, le bloc équivalent de
 * la home est généré en texte seul par le prerender (reviewsHomeBlockHTML).
 *
 * Accessibilité : pause au survol (CSS), prefers-reduced-motion → le défilement
 * s'arrête et la bande redevient un scroll manuel, 2e groupe marqué aria-hidden.
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

interface Review {
  id: string;
  author: string;
  city: string;
  date: string;
  rating: number;
  text: string;
  verified?: boolean;
  avatar?: string;
}

function ReviewCard(r: Review) {
  return (
    <article
      key={r.id}
      className="w-[270px] shrink-0 flex flex-col gap-3 border border-[#F4F4F4] bg-[#F4F4F4] rounded-[12px] p-4"
    >
      {/* En-tête : avatar (photo ou initiales en repli) + nom + ville/date */}
      <header className="flex items-center gap-2.5">
        {r.avatar ? (
          <img
            src={r.avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            translate="no"
            className="shrink-0 h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span
            translate="no"
            className="shrink-0 h-9 w-9 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[12px] font-bold text-[#4B5563]"
          >
            {initials(r.author)}
          </span>
        )}
        <div className="min-w-0">
          <p translate="no" className="text-[14px] font-semibold text-black truncate">
            {r.author}
          </p>
          <p translate="no" className="text-[12px] text-[#6B7280]">
            {r.city} · {r.date}
          </p>
        </div>
      </header>

      {/* Étoiles (visuel uniquement) + badge vérifié */}
      <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} filled={i <= r.rating} />
        ))}
        {r.verified && (
          <span className="bg-[#E6F4EA] text-[#1E7F3B] rounded-full px-2 py-0.5 text-[10px] font-semibold">
            ✓&nbsp;Verified
          </span>
        )}
      </div>

      {/* Texte de l'avis */}
      <p className="text-[14px] text-[#1F1F1F] leading-[1.45]">{r.text}</p>
    </article>
  );
}

export function ReviewsCarousel() {
  if (reviews.length === 0) return null;
  const avg =
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
    ) / 10;

  return (
    <section className="w-full my-10" aria-label="Customer reviews">
      <header className="max-w-6xl mx-auto px-4 md:px-6 space-y-1">
        <h2 className="text-3xl font-bold text-black tracking-tight">
          What our customers say
        </h2>
        <p className="text-[15px] text-[#9E9E9E]">
          {avg}/5 average from {reviews.length} verified orders across Australia.
        </p>
      </header>

      <div className="reviews-marquee">
        <div className="reviews-marquee-track">
          <div className="reviews-marquee-group">
            {reviews.map((r) => ReviewCard(r))}
          </div>
          {/* 2e groupe identique → la boucle -50% se recolle sans à-coup */}
          <div className="reviews-marquee-group" aria-hidden="true">
            {reviews.map((r) => ReviewCard(r))}
          </div>
        </div>
      </div>
    </section>
  );
}