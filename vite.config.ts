import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    // Découpage vendor : gros morceaux tiers en chunks séparés (HTTP/2 = chargement
    // en parallèle + cache stable) → l'entrée app devient légère. Seuls les paquets
    // SÛREMENT utilisés à l'entrée sont regroupés (pas de radix optionnel : un
    // package lazy-only atterrirait dans l'initial). Les autres suivent le défaut.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const rest = id.split("node_modules/")[1];
          const pkg = rest.startsWith("@")
            ? rest.split("/").slice(0, 2).join("/")
            : rest.split("/")[0];
          if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler") {
            return "vendor-react";
          }
          if (
            pkg === "@tanstack/react-router" ||
            pkg === "@tanstack/router-core" ||
            pkg === "@tanstack/history" ||
            pkg === "@tanstack/store" ||
            pkg === "@tanstack/react-store"
          ) {
            return "vendor-router";
          }
          if (
            pkg === "lucide-react" ||
            pkg === "sonner" ||
            pkg === "vaul" ||
            pkg === "clsx" ||
            pkg === "tw-animate-css"
          ) {
            return "vendor-ui";
          }
          return undefined; // défaut Vite (shared chunk ou route chunk)
        },
      },
    },
  },
});
