import type { ListItem, Product } from "./types";

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
  return (line.product.price_aud ?? 0) * line.quantity;
}

export function ordersTotal(lines: OrderLine[]): number {
  return lines.reduce((s, l) => s + lineTotal(l), 0);
}

function fmt(p: number | null | undefined): string {
  if (p == null) return "Price on request";
  return `A$${p.toFixed(2)}`;
}

export function buildTelegramMessage(lines: OrderLine[], deliveryAddress = ""): string {
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
      const unit = l.product.price_aud == null ? "Price on request" : fmt(l.product.price_aud);
      const total = l.product.price_aud == null ? "—" : fmt(lineTotal(l));
      return `${i + 1}. ${l.product.name}\n     ${unit} × ${l.quantity} = ${total}`;
    })
    .join("\n\n");

  const totalLine = `TOTAL:  ${fmt(ordersTotal(lines))} AUD`;

  const addressSection = deliveryAddress.trim()
    ? `🚚  DELIVERY ADDRESS\n\n    ${deliveryAddress.trim()}`
    : `🚚  DELIVERY ADDRESS\n\n    Not specified`;

  const payment = [
    "💳  PAYMENT",
    "    PayID, Bank Transfer or Crypto — payment required before delivery.",
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
    payment,
    divider,
    footer,
  ].join("\n");
}

export function buildTelegramUrl(message: string, handle = TELEGRAM_HANDLE): string {
  return `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
}
