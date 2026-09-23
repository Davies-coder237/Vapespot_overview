import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage } from "@/components/InstitutionalPage";
import institutional from "@/data/institutional.json";

const meta = institutional.pages.find((p) => p.slug === "contact");

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `${meta.title} — Vape Spot` },
      { name: "description", content: meta.metaDescription },
      { property: "og:title", content: meta.title },
      { property: "og:description", content: meta.metaDescription },
    ],
  }),
  component: Contact,
});

function Contact() {
  return <InstitutionalPage slug="contact" />;
}