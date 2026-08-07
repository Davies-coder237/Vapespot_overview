import { createFileRoute, Link } from "@tanstack/react-router";
import guides from "@/data/guides.json";

export const Route = createFileRoute("/guides/")({
  component: GuidesHome,
  head: () => ({
    meta: [
      { title: "Vape Guides Australia — Vape Spot" },
      {
        name: "description",
        content:
          "Practical vape guides for Australia: how to fix a dry hit, does vaping smell, vaping laws, puff counts and more.",
      },
    ],
  }),
});

function GuidesHome() {
  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 space-y-10">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
            Vape Spot Guides
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#0A0A0A] leading-tight">
            Guides Australia
          </h1>
          <p className="text-[15px] text-[#6E6E73] max-w-xl">
            Practical answers to the questions Australian vapers actually ask —
            written from real store experience.
          </p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2">
          {guides.guides.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="block border border-[#E5E7EB] p-5 min-h-[150px] hover:border-[#7C3AED]/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">
                  <span>{g.category}</span>
                  <span className="text-[#D1D5DB]">/</span>
                  <span className="text-[#6E6E73]">{g.readTime}</span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-[#0A0A0A] leading-snug">
                  {g.title}
                </h2>
                <p className="mt-2 text-sm text-[#6E6E73] line-clamp-2">
                  {g.intro}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#7C3AED]">
                  Read guide
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}