import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAgeVerified } from "@/lib/storage";

export function AgeGate({ children }: { children: React.ReactNode }) {
  const { verified, verify } = useAgeVerified();
  const [hidden, setHidden] = useState(verified);
  const [fading, setFading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verified) {
      setFading(true);
      const t = setTimeout(() => setHidden(true), 200);
      return () => clearTimeout(t);
    }
  }, [verified]);

  const handleVerify = () => {
    setLoading(true);
    // Wait 2 frames so "Loading…" renders before the fade starts
    requestAnimationFrame(() => requestAnimationFrame(verify));
  };

  if (hidden) return <>{children}</>;

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6"
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 200ms ease",
          pointerEvents: fading ? "none" : "auto",
        }}
      >
        <div className="w-full max-w-[360px] flex flex-col items-center text-center">

          {/* Logo */}
          <img
            src="/images/cat/logo-vapespot.webp"
            alt="Vape Spot"
            className="h-10 w-auto object-contain mb-10"
          />

          {/* Title */}
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#0A0A0A",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}
          >
            Are you 18 years or older?
          </h1>

          {/* Subtitle */}
          <p
            style={{
              marginTop: "12px",
              fontSize: "15px",
              color: "#6B7280",
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            This website contains vaping products intended for adults only.
          </p>

          {/* Buttons */}
          <div style={{ marginTop: "36px", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "12px",
                backgroundColor: loading ? "#555" : "#0A0A0A",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: 600,
                border: "none",
                cursor: loading ? "default" : "pointer",
                letterSpacing: "-0.01em",
                transition: "background-color 150ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" style={{ width: "16px", height: "16px" }} />
                  Loading website...
                </>
              ) : (
                "Yes, I am 18 years or older."
              )}
            </button>

            <button
              onClick={() => { window.location.href = "https://www.google.com"; }}
              disabled={loading}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "12px",
                backgroundColor: "#FFFFFF",
                color: "#0A0A0A",
                fontSize: "15px",
                fontWeight: 500,
                border: "1px solid #E5E7EB",
                cursor: loading ? "default" : "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              Leave Site
            </button>
          </div>

          {/* Legal notice */}
          <p
            style={{
              marginTop: "28px",
              fontSize: "11px",
              color: "#9CA3AF",
              lineHeight: 1.6,
              fontWeight: 400,
              maxWidth: "280px",
            }}
          >
            By entering this site you confirm that you are of legal age to purchase vaping products in your jurisdiction.
          </p>
        </div>
      </div>
    </>
  );
}
