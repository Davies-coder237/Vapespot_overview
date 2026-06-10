import { useCallback, useEffect, useState } from "react";
import type { ListItem } from "./types";

const KEYS = {
  age: "ageVerified",
  list: "vape:my-list",
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

export function useAgeVerified() {
  const [verified, setVerified] = useState<boolean>(() =>
    read<boolean>(KEYS.age, false)
  );
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
