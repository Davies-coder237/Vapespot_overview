import type { ListItem, Product } from "./types";
import { CRYPTO_DISCOUNT_PERCENT, PACK_TIERS, packPrice } from "./packs";
import { cryptoDiscounted } from "./checkout";

export const TELEGRAM_HANDLE = "vapespot_store";

export interface OrderLine {
  product: Product;
  quantity: number;
}

export function buildOrderLines(items: ListItem[], products: Product[]): OrderLine[] {
  return items
    .map((i) => {
      const product = products.find((p) => p.id === i.productId);
      return product ? { product, quantity: i.quantity } : null;
    })
    .filter((x): x is OrderLine => x !== null);
}

export function lineTotal(line: OrderLine): number {
  return packPrice(line.product.price_aud, line.quantity) ?? 0;
}

export function ordersTotal(lines: OrderLine[]): number {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}

function fmt(p: number | null | undefined): string {
  if (p == null) return "Price on request";
  return `A$${p.toFixed(2)}`;
}

export function buildTelegramMessage(lines: OrderLine[], deliveryAddress = "", deliveryMethod: "courier" | "australia_post" = "courier"): string {
  if (lines.length === 0) {
    return "Hello! I'd like to place an order on Vape Spot.";
  }

  const date = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const divider = "─────────────────────────";

  const header = `🛒  NEW ORDER — VAPE SPOT\n📅  ${date}`;

  const productLines = lines
    .map((l, i) => {
      const totalNum = lineTotal(l);
      const total = l.product.price_aud == null ? "—" : fmt(totalNum);
      // Pour un pack, on affiche le prix unitaire réellement appliqué (total/qty).
      const effUnit = l.quantity > 0 && l.product.price_aud != null ? totalNum / l.quantity : l.product.price_aud;
      const unit = l.product.price_aud == null ? "Price on request" : fmt(effUnit);
      const isPack = PACK_TIERS.some((t) => t.qty === l.quantity);
      return `${i + 1}. ${l.product.name}\n     ${unit} × ${l.quantity} = ${total}${isPack ? "  (pack of " + l.quantity + ")" : ""}`;
    })
    .join("\n\n");

  const totalLine = `TOTAL:  ${fmt(ordersTotal(lines))} AUD`;

  const addressSection = deliveryAddress.trim()
    ? `🚚  DELIVERY ADDRESS\n\n    ${deliveryAddress.trim()}`
    : `🚚  DELIVERY ADDRESS\n\n    Not specified`;

  const deliveryMethodSection = deliveryMethod === "courier"
    ? [
        "🛵  DELIVERY METHOD",
        "    Hand-delivered by local courier — usually 30 min–2hrs.",
        "    (Or via Australia Post if requested.)",
      ].join("\n")
    : [
        "📮  DELIVERY METHOD",
        "    Via Australia Post — 1–3 business days, depending on location.",
      ].join("\n");

  const total = ordersTotal(lines);
  const cryptoTotal = cryptoDiscounted(total);
  const payment = [
    "💳  PAYMENT",
    `    PayID or Bank Transfer :  ${fmt(total)}`,
    `    Crypto or Gift Card :     ${fmt(cryptoTotal)}  (save ${CRYPTO_DISCOUNT_PERCENT}%)`,
    "    Payment required before delivery.",
  ].join("\n");

  const footer = "Please reply to confirm this order. Thank you! 🙏";

  return [
    header,
    divider,
    "📦  ORDER\n",
    productLines,
    divider,
    totalLine,
    divider,
    addressSection,
    divider,
    deliveryMethodSection,
    divider,
    payment,
    divider,
    footer,
  ].join("\n");
}

export function buildTelegramUrl(message: string, handle = TELEGRAM_HANDLE): string {
  return `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
}
