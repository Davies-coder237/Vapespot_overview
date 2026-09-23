import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="w-full bg-white" style={{ borderTop: "1px solid #E5E7EB" }}>
      <div className="flex flex-col items-center pt-8 pb-20 md:pb-8 lg:py-10" style={{ gap: "6px" }}>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          aria-label="Company"
        >
          {[
            { to: "/about", label: "About Us" },
            { to: "/delivery", label: "Delivery" },
            { to: "/returns", label: "Returns" },
            { to: "/contact", label: "Contact Us" },
            { to: "/guides", label: "Vape Guides" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[13px] lg:text-sm font-medium hover:underline"
              style={{ color: "#6B7280" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p
          className="text-[13px] lg:text-sm"
          style={{ color: "#1F1F1F", fontWeight: 600, letterSpacing: "0.01em" }}
        >
          © 2026 Vape Spot. All rights reserved.
        </p>
        <p
          className="text-[11px] lg:text-[13px]"
          style={{ color: "#6B7280", fontWeight: 400, marginTop: "4px" }}
        >
          For adult consumers only — you must be 18+ to purchase. ID may be
          requested on delivery.
        </p>
      </div>
    </footer>
  );
}
