/**
 * gsc-auth.mjs — première autorisation Google (flux OAuth loopback)
 *
 * 1. Lit gsc-client.json (identifiants Desktop app déposés sur le Bureau)
 * 2. Ouvre automatiquement le navigateur sur la page de consentement Google
 * 3. À la redirection locale, échange le code contre des tokens
 * 4. Sauvegarde gsc-token.json (access + refresh) — prêt pour les requêtes
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CRED_F = join(ROOT, "gsc-client.json");
const TOKEN_F = join(ROOT, "gsc-token.json");
if (!existsSync(CRED_F)) {
  console.error("❌ gsc-client.json introuvable. Pose le fichier client_secret dans vapespot_work.");
  process.exit(1);
}
const CRED = JSON.parse(readFileSync(CRED_F, "utf8")).installed;

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const PORT = 19710;
const REDIRECT = `http://localhost:${PORT}/`;

if (existsSync(TOKEN_F)) {
  const t = JSON.parse(readFileSync(TOKEN_F, "utf8"));
  const ok = t.refresh_token || t.access_token;
  console.log(`Token déjà présent. access=${!!t.access_token} refresh=${!!t.refresh_token}`);
  console.log(ok ? "✅ Aucune autorisation nécessaire." : "⚠️ Token incomplet, relance.");
  process.exit(0);
}

const state = Math.random().toString(36).slice(2);
const authUrl =
  `${CRED.auth_uri}?client_id=${encodeURIComponent(CRED.client_id)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent&state=${state}`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== "/") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Aucun code recu. Ferme et relance.");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    res.writeHead(400);
    res.end("state invalide");
    return;
  }
  try {
    const resp = await fetch(CRED.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CRED.client_id,
        client_secret: CRED.client_secret,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code",
      }),
    });
    const data = await resp.json();
    if (!data.access_token) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erreur d'autorisation. Détail ci-dessous :\n\n" + JSON.stringify(data, null, 2));
      console.error("ERREUR token:", JSON.stringify(data, null, 2));
      return;
    }
    data.created_at = Date.now();
    writeFileSync(TOKEN_F, JSON.stringify(data, null, 2));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2 style='font-family:sans-serif'>Autorisation reussie ✅ Tu peux fermer cette fenetre.</h2>");
    console.log("✅ TOKEN sauvé dans gsc-token.json");
    server.close(() => process.exit(0));
  } catch (e) {
    res.writeHead(500);
    res.end("Erreur: " + e.message);
    console.error("EXCEPTION:", e);
  }
});

server.on("error", (e) => {
  console.error("❌ Impossible d'ouvrir le port local :", e.message);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Ouvre CETTE URL dans ton navigateur (elle s'ouvre toute seule) et autorise :");
  console.log("\n" + authUrl + "\n");
  const b = spawn("cmd", ["/c", "start", "", authUrl], { detached: true, stdio: "ignore" });
  b.unref();
});