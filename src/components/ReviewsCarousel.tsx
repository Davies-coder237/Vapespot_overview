import { useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import reviews from "@/data/reviews.json";

/**
 * Carrousel « What our customers say » de la HOMEPAGE — les 200 avis du site
 * en défilement horizontal INFINI.
 *
 * Technique : 2 groupes IDENTIQUES côte à côte ; le défilement auto (JS,
 * scrollLeft) rembobine de un groupe dès qu'on atteint la mi-chemin → la
 * boucle est continue et sans à-coup (le contenu est identique aux deux
 * positions). Les flèches, le drag et la roulette défilent aussi en boucle.
 *
 * ⚠️ RÈGLE STRICTE (idem CustomerReviews) : les étoiles sont du VISUEL (SVG),
 * JAMAIS de balisage schema.org Review / aggregateRating (Google interdit les
 * rich snippets d'avis pour le vapotage). Pour Google, le bloc équivalent de
 * la home est généré en texte seul par le prerender (reviewsHomeBlockHTML).
 *
 * Accessibilité : pause au survol / pendant le drag (relance 4 s après),
 * prefers-reduced-motion → pas d'auto, défilement manuel uniquement,
 * 2e groupe marqué aria-hidden.
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

const STEP = 420; // amplitude d'un clic sur les flèches (~1.5 carte)

export function ReviewsCarousel() {
  if (reviews.length === 0) return null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Largeur d'UN groupe = moitié du track (2 groupes identiques).
  const groupWidth = () => {
    const el = scrollerRef.current;
    return el ? el.scrollWidth / 2 : 0;
  };

  const pauseAuto = (ms: number) => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, ms);
  };
  const pauseIndefinitely = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  // Auto-défilement fluide : rembobine de -un groupe à mi-chemin (identique).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const g = el.scrollWidth / 2;
      if (!g) return;
      const next = el.scrollLeft + 2;
      el.scrollLeft = next >= g ? next - g : next;
    }, 25);
    return () => clearInterval(id);
  }, []);

  // Rembobinage natif (drag / roulette / pavé tactile) : à la fin → retour au début.
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const g = el.scrollWidth / 2;
    if (g > 0 && el.scrollLeft >= g) el.scrollLeft -= g;
  };

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    pauseAuto(6000);
    const g = el.scrollWidth / 2;
    if (!g) return;
    let target = el.scrollLeft + dir * STEP;
    if (target >= g) target -= g;
    if (target < 0) target += g;
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  const avg =
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
    ) / 10;

  return (
    <section className="w-full my-10" aria-label="Customer reviews">
      <header className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-black tracking-tight">
            What our customers say
          </h2>
          <p className="text-[15px] text-[#9E9E9E]">
            {avg}/5 average from {reviews.length} verified orders across Australia.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] border border-[#E5E7EB]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] border border-[#E5E7EB]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onMouseEnter={pauseIndefinitely}
        onMouseLeave={() => pauseAuto(4000)}
        onPointerDown={pauseIndefinitely}
        onPointerUp={() => pauseAuto(4000)}
        className="flex overflow-x-auto scrollbar-none"
      >
        {/* Groupe 1 : 200 avis (lisible pour les lecteurs d'écran) */}
        <div className="flex gap-5 pr-5 shrink-0">
          {reviews.map((r) => ReviewCard(r))}
        </div>
        {/* Groupe 2 : copie identique pour la boucle infinie (aria-hidden) */}
        <div className="flex gap-5 pr-5 shrink-0" aria-hidden="true">
          {reviews.map((r) => ReviewCard(r))}
        </div>
      </div>
    </section>
  );
}