import { Link } from "@tanstack/react-router";
import institutional from "@/data/institutional.json";

const CONTACT = institutional.contact;

/**
 * Rendu SPA d'une page institutionnelle (about / delivery / returns / contact).
 * Parité avec le seo-block statique du prerender (même contenu, même structure)
 * : Google lit le HTML prérendu, l'humain voit cette page React.
 */
export function InstitutionalPage({ slug }: { slug: string }) {
  const page = institutional.pages.find((p) => p.slug === slug);
  if (!page) return null;

  const { contact } = institutional;
  const isContact = slug === "contact";

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
            <Link to="/" className="text-[#7C3AED] hover:underline">Home</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-[#6E6E73]">{page.eyebrow}</span>
          </div>
          <h1 className="text-[26px] md:text-[36px] font-bold text-[#0A0A0A] leading-tight">
            {page.title}
          </h1>
        </header>

        {/* Intro */}
        <p className="text-[17px] leading-relaxed text-[#1F1F1F]">{page.intro}</p>

        {/* Contact box (page contact uniquement) */}
        {isContact && (
          <div className="border border-[#F0EEFF] bg-[#F0EEFF]/60 p-6 space-y-3">
            <h2 className="text-[18px] font-bold text-[#0A0A0A]">Contact details</h2>
            <div className="grid gap-2 text-[15px] text-[#3F3F46]">
              <p>Telegram: <span className="font-semibold text-[#0A0A0A]">@{contact.telegram}</span></p>
              <p>Email: <span className="font-semibold text-[#0A0A0A]">{contact.email}</span></p>
            </div>
            <a
              href={contact.telegramUrl}
              className="inline-flex items-center justify-center rounded-none bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Open a chat on Telegram →
            </a>
          </div>
        )}

        {/* Sections */}
        {page.sections.map((s, i) => (
          <section key={i} className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              {s.heading}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} className="text-[15px] leading-relaxed text-[#3F3F46]">
                {p}
              </p>
            ))}
            {s.list && s.list.length > 0 && (
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

        {/* FAQ */}
        {page.faq.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A]">
              Frequently asked questions
            </h2>
            {page.faq.map((f, i) => (
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

        {/* Cross-links institutionnelles (co-signaux E-E-A-T) */}
        {page.crossLinks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#0A0A0A] pt-2">
              Useful information
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {page.crossLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block border border-[#E5E7EB] p-4 hover:border-[#7C3AED]/50 transition-colors"
                >
                  <span className="block text-sm font-semibold text-[#0A0A0A]">{l.label}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#7C3AED]">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Avertissement âge */}
        <p className="text-[12px] text-[#9E9E9E]">{contact.ageNote}</p>

        {/* CTA */}
        <div className="border border-[#F0EEFF] bg-[#F0EEFF]/60 p-6 space-y-3">
          <h2 className="text-[18px] font-bold text-[#0A0A0A]">{page.cta.title}</h2>
          <p className="text-[15px] text-[#3F3F46]">{page.cta.text}</p>
          {isContact ? (
            <a
              href={contact.telegramUrl}
              className="inline-flex items-center justify-center rounded-none bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Open a chat on Telegram →
            </a>
          ) : (
            <Link
              to={page.cta.to}
              className="inline-flex items-center justify-center rounded-none bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Browse the catalogue
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}