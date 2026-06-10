import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search as SearchIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice, searchProducts } from "@/lib/data";
import type { SearchEntry } from "@/lib/types";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    let active = true;
    if (!q.trim()) {
      setResults([]);
      return;
    }
    searchProducts(q, 25).then((r) => {
      if (active) setResults(r);
    });
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 top-[10%] translate-y-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search products</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-4 h-14">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands, series…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q && results.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">No results.</p>
          )}
          <ul className="divide-y">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  to="/product/$id"
                  params={{ id: r.id }}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <img
                    src={r.thumb || "/placeholder.svg"}
                    alt=""
                    className="h-10 w-10 rounded object-cover bg-muted"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.brand}
                      {r.series ? ` · ${r.series}` : ""} · {r.path.join(" / ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(r.price_aud)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
