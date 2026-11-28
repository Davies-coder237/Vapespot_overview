// Helpers du chat maison (ÉTAPE 4). Identifiant opaque + libellé convivial,
// stables en localStorage (Cas A : même navigateur, retrouve la même conversation).

const CLIENT_KEY = "vape:chat-client";
const VISITOR_KEY = "vape:chat-visitor";
const ORDER_KEY = "vape:chat-order"; // { order, email, amount } — pour une réouverture après refresh

function ls(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string, fb: T): T {
  try {
    const v = ls()?.getItem(key);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

function write(key: string, value: unknown): void {
  try {
    ls()?.setItem(key, JSON.stringify(value));
  } catch {
    /* ignoré (mode privé/site data bloqué) */
  }
}

// ID opaque stable (clé du Durable Object chat:<id>). Borne + caractères sûrs
// (validé côté serveur par ID_RE). Court (~14 car.) pour tenir dans le
// callback_data du bouton ↩️ Reply de Telegram (limite 64 octets).
export function getClientId(): string {
  let id = read<string | null>(CLIENT_KEY, null);
  if (!id || !/^[A-Za-z0-9_-]{6,128}$/.test(id)) {
    id =
      "c" +
      Math.random().toString(36).slice(2, 12) +
      Date.now().toString(36).slice(-5);
    write(CLIENT_KEY, id);
  }
  return id;
}

// Libellé convivial affiché à l'admin avant commande : « Visitor 8327 » (4 chiffres).
export function getVisitorLabel(): string {
  let label = read<string | null>(VISITOR_KEY, null);
  if (!label) {
    label = String(1000 + Math.floor(Math.random() * 9000));
    write(VISITOR_KEY, label);
  }
  return label;
}

export interface ChatOrderStamp {
  order: string;
  email: string;
  amount: string;
}

export function saveOrderStamp(stamp: ChatOrderStamp): void {
  write(ORDER_KEY, stamp);
}

export function getOrderStamp(): ChatOrderStamp | null {
  return read<ChatOrderStamp | null>(ORDER_KEY, null);
}

// Événement global : OrderSummary le dispatch après création serveur de la commande.
// Le widget s'abonne pour (b) ouvrir + injecter + saluer.
export const CHAT_ORDER_EVENT = "vapespot:chat-order";

export function dispatchOrderPlaced(stamp: ChatOrderStamp): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(CHAT_ORDER_EVENT, { detail: stamp }),
    );
  } catch {
    /* ignoré */
  }
}