import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { captureClickId } from "./lib/storage";
import "./styles.css";

// Désactive l'invite PWA "Installer l'application" (bouton navigateur + widget bureau).
// Le manifest sert uniquement aux favicons/maskable, pas à l'installation.
window.addEventListener("beforeinstallprompt", (e) => e.preventDefault());

// Capture du clickid pub PopCash dès l'arrivée sur le site (premier chargement),
// AVANT toute navigation SPA qui retirerait le paramètre d'URL.
// Le clickid est ainsi gardé en localStorage pour le conversion tracker.
captureClickId();

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
