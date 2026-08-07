import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import guides from "@/data/guides.json";

function findGuide(slug: string) {
  return guides.guides.find((g) => g.slug === slug);
}

export const Route = createFileRoute("/guides/$slug")({
  component: GuidePage,
  head: ({ match }) => {
    const { slug } = match.params;
    const g = findGuide(slug);
    if (!g) return {};
    return {
      meta: [
        { title: `${g.title} — Vape Spot` },
        { name: "description", content: g.metaDescription },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.metaDescription },
        { property: "og:image", content: g.hero.image },
        { property: "og:type", content: "article" },
      ],
    };
  },
});

function GuidePage() {
  const { slug } = Route.useParams();
  const g = findGuide(slug);
  if (!g) throw notFound();

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-10 space-y-8">
        {/* En-tête */}
        <header className="space-y-3">
          <Link
            to="/guides"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#7C3AED] hover:underline"
          >
            <span aria-hidden>←</span> All guides
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
            <span>{g.category}</span>
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-[#6E6E73]">{g.readTime}</span>
          </div>
          <h1 className="text-[26px] md:text-[36px] font-bold text-[#0A0A0A] leading-tight">
            {g.title}
          </h1>
          <p className="text-[13px] text-[#9E9E9E]">{g.date}</p>
        </header>

        {/* Hero */}
        <img
          src={g.hero.image}
          alt={g.hero.alt}
          loading="eager"
          className="w-full aspect-[16/9] object-cover border border-[#F0F0F0]"
        />

        {/* Intro */}
        <p className="text-[17px] leading-relaxed text-[#1F1F1F]">{g.intro}</p>

        {/* Sections */}
        {g.sections.map((s, i) => (
          <section key={i} className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              {s.heading}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} className="text-[15px] leading-relaxed text-[#3F3F46]">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="space-y-2 pl-1">
                {s.list.map((item, j) => (
                  <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-[#3F3F46]">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Liens produits */}
        {g.links.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              Related products
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to as never}
                  className="border border-[#E5E7EB] p-4 hover:border-[#7C3AED]/50 transition-colors"
                >
                  <span className="block text-sm font-semibold text-[#0A0A0A]">{l.label}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#7C3AED]">
                    View product →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {g.faq.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A]">
              Frequently asked questions
            </h2>
            {g.faq.map((f, i) => (
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
          <h2 className="text-[18px] font-bold text-[#0A0A0A]">{g.cta.title}</h2>
          <p className="text-[15px] text-[#3F3F46]">{g.cta.text}</p>
          <Link
            to={g.cta.to as never}
            className="inline-flex items-center justify-center rounded-none bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Browse the catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}