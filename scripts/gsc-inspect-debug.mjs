import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CRED = JSON.parse(readFileSync(join(ROOT, "gsc-client.json"), "utf8")).installed;
let token = JSON.parse(readFileSync(join(ROOT, "gsc-token.json"), "utf8"));

async function ensureToken() {
  if (token.access_token && Date.now() - token.created_at < 55 * 60 * 1000) return token.access_token;
  const resp = await fetch(CRED.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id: CRED.client_id,
      client_secret: CRED.client_secret,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  token = { ...token, ...data, created_at: Date.now() };
  return data.access_token;
}

const access = await ensureToken();
const site = "https://vapespot.store/";
const urls = [
  "https://vapespot.store/",
  "https://vapespot.store/vapespot-sydney-cbd",
  "https://vapespot.store/vapespot-parramatta",
];
for (const inspectionUrl of urls) {
  const resp = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl, siteUrl: site }),
  });
  const raw = await resp.text();
  console.log("URL:", inspectionUrl, "| HTTP", resp.status);
  console.log("   " + raw.slice(0, 1000));
}