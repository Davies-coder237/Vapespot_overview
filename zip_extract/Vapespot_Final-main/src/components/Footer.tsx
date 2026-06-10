export function Footer() {
  return (
    <footer className="w-full bg-white" style={{ borderTop: "1px solid #E5E7EB" }}>
      <div className="flex flex-col items-center pt-8 pb-20 md:pb-8 lg:py-10" style={{ gap: "6px" }}>
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
          For adult consumers only. Age restrictions apply.
        </p>
      </div>
    </footer>
  );
}
