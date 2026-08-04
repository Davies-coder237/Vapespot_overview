import { useCallback, useEffect, useState } from "react";
import type { ListItem } from "./types";

const KEYS = {
  age: "ageVerified",
  list: "vape:my-list",
  clickId: "vape:click-id",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("vape:storage", { detail: { key } }));
}

// Bypass campagne pub (PopCash) : si le lien de la pub porte ?age=18,
// le visiteur est considéré comme vérifié → l'age gate ne s'affiche pas.
function hasAdBypass(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("age") === "18";
}

// Conversion tracking PopCash : on garde le clickid de la campagne pub
// (reçu via l'URL ?clickid=[clickid]) pour le renvoyer à PopCash plus tard
// quand le visiteur atteint une étape clé (panier, envoi de commande).
export function captureClickId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("clickid");
  if (id) {
    window.localStorage.setItem(KEYS.clickId, JSON.stringify(id));
  }
  return getClickId();
}

export function getClickId(): string | null {
  return read<string | null>(KEYS.clickId, null);
}

export function useAgeVerified() {
  const [verified, setVerified] = useState<boolean>(() => {
    if (hasAdBypass()) return true;
    return read<boolean>(KEYS.age, false);
  });

  useEffect(() => {
    if (hasAdBypass()) {
      // Le garde en mémoire pour toute la visite (même après navigation)
      write(KEYS.age, true);
      setVerified(true);
    }
  }, []);

  const verify = useCallback(() => {
    write(KEYS.age, true);
    setVerified(true);
  }, []);
  return { verified, verify };
}

export function useMyList() {
  const [items, setItems] = useState<ListItem[]>(() => read<ListItem[]>(KEYS.list, []));

  useEffect(() => {
    const sync = () => setItems(read<ListItem[]>(KEYS.list, []));
    sync();
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.key === KEYS.list) sync();
    };
    window.addEventListener("vape:storage", handler);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vape:storage", handler);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: ListItem[]) => {
    write(KEYS.list, next);
    setItems(next);
  }, []);

  const add = useCallback(
    (productId: string, quantity = 1) => {
      const current = read<ListItem[]>(KEYS.list, []);
      const idx = current.findIndex((i) => i.productId === productId);
      const next =
        idx >= 0
          ? current.map((i, n) => (n === idx ? { ...i, quantity: i.quantity + quantity } : i))
          : [...current, { productId, quantity }];
      save(next);
    },
    [save],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = read<ListItem[]>(KEYS.list, []);
      const next =
        quantity <= 0
          ? current.filter((i) => i.productId !== productId)
          : current.some((i) => i.productId === productId)
            ? current.map((i) => (i.productId === productId ? { ...i, quantity } : i))
            : [...current, { productId, quantity }];
      save(next);
    },
    [save],
  );

  const remove = useCallback(
    (productId: string) => {
      save(read<ListItem[]>(KEYS.list, []).filter((i) => i.productId !== productId));
    },
    [save],
  );

  const clear = useCallback(() => save([]), [save]);

  return { items, add, setQuantity, remove, clear };
}
