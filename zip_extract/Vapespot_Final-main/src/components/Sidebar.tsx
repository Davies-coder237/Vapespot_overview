import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Send, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildNavTree,
  categoryImage,
  loadMeta,
  onImageError,
  subcategoryImage,
  subSubImage,
} from "@/lib/data";
import type { NavNode } from "@/lib/data";
import { useMyList } from "@/lib/storage";
import { TELEGRAM_HANDLE, buildTelegramUrl, buildTelegramMessage } from "@/lib/telegram";

type Page =
  | { level: "root" }
  | { level: "sub"; cat: NavNode }
  | { level: "subsub"; cat: NavNode; sub: NavNode };

export function Sidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tree, setTree] = useState<NavNode[]>([]);
  const [page, setPage] = useState<Page>({ level: "root" });
  const { items } = useMyList();
  const listCount = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    loadMeta().then((m) => setTree(buildNavTree(m))).catch(() => setTree([]));
  }, []);

  // Reset to root whenever sidebar closes
  useEffect(() => {
    if (!open) setPage({ level: "root" });
  }, [open]);

  const close = () => onOpenChange(false);

  const leafLink = (node: NavNode, parent?: NavNode, grand?: NavNode) => {
    if (grand && parent) {
      return {
        to: "/products/$category" as const,
        params: { category: grand.slug },
        search: { sub: parent.slug, subsub: node.slug },
      };
    }
    if (parent) {
      return {
        to: "/products/$category" as const,
        params: { category: parent.slug },
        search: { sub: node.slug },
      };
    }
    return {
      to: "/products/$category" as const,
      params: { category: node.slug },
      search: {},
    };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[340px] p-0 bg-white border-r-0 overflow-y-auto [&>button]:hidden"
      >
        {/* ── ROOT PAGE ── */}
        {page.level === "root" && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4">
              <SheetTitle asChild>
                <div className="flex items-center justify-between">
                  <Link to="/" onClick={close} aria-label="Vape Spot">
                    <img
                      src="/images/logo-vapespot.webp"
                      alt="Vape Spot"
                      className="h-8 w-auto"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="p-1.5 text-black hover:opacity-70"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="px-3 pb-4">
              <Link
                to="/"
                onClick={close}
                className="flex items-center gap-3 px-2 py-2.5 hover:bg-[#F5F5F7] transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/cat/Hero-mobile.webp"
                    alt=""
                    className="w-full h-full object-cover"
                    onError={onImageError}
                  />
                </div>
                <span className="text-[15px] font-semibold text-black">Home</span>
              </Link>

              <Link
                to="/my-list"
                onClick={close}
                className="flex items-center gap-3 px-2 py-2.5 hover:bg-[#F5F5F7] transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[10px] font-semibold text-[#6E6E73]">
                  List
                </div>
                <span className="text-[15px] font-medium text-[#6E6E73] flex-1">My List</span>
                {listCount > 0 && (
                  <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#7C3AED] text-white text-[11px] font-semibold flex items-center justify-center">
                    {listCount}
                  </span>
                )}
              </Link>

              <p className="px-2 pt-5 pb-2 text-[11px] font-semibold tracking-[0.1em] text-[#7C3AED]">
                CATEGORIES
              </p>

              <div className="space-y-0.5">
                {tree.map((cat) => {
                  const isLeaf = cat.action === "load";
                  return (
                    <div key={cat.slug}>
                      {isLeaf ? (
                        <Link
                          {...leafLink(cat)}
                          onClick={close}
                          className="flex items-center gap-3 px-2 py-3 hover:bg-[#F5F5F7] transition-colors"
                        >
                          <img
                            src={categoryImage(cat.slug)}
                            alt=""
                            className="h-12 w-12 object-contain shrink-0"
                            onError={onImageError}
                          />
                          <span className="text-[15px] font-medium text-black flex-1 text-left capitalize">
                            {cat.label}
                          </span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPage({ level: "sub", cat })}
                          className="w-full flex items-center gap-3 px-2 py-3 hover:bg-[#F5F5F7] transition-colors"
                        >
                          <img
                            src={categoryImage(cat.slug)}
                            alt=""
                            className="h-12 w-12 object-contain shrink-0"
                            onError={onImageError}
                          />
                          <span className="text-[15px] font-medium text-black flex-1 text-left capitalize">
                            {cat.label}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <a
                href={buildTelegramUrl(buildTelegramMessage([]), TELEGRAM_HANDLE)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center gap-3 p-4 bg-[#F5F5F7]"
              >
                <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white shrink-0">
                  <Send className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#6E6E73]">Contact us on</p>
                  <p className="text-sm font-bold leading-tight text-black">Telegram</p>
                  <p className="text-[11px] text-[#6E6E73]">We reply fast 24/7</p>
                </div>
              </a>
            </div>
          </>
        )}

        {/* ── SUB PAGE ── */}
        {page.level === "sub" && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#F0F0F0]">
              <SheetTitle asChild>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage({ level: "root" })}
                    aria-label="Back"
                    className="p-1.5 text-black hover:opacity-70"
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </button>
                  <span className="text-[17px] font-bold text-black capitalize flex-1">
                    {page.cat.label}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="p-1.5 text-black hover:opacity-70"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="px-3 py-2 space-y-0.5">
              {page.cat.children.map((sub) => {
                const isLeaf = sub.action === "load";
                return (
                  <div key={sub.slug}>
                    {isLeaf ? (
                      <Link
                        {...leafLink(sub, page.cat)}
                        onClick={close}
                        className="flex items-center gap-3 px-2 py-3 hover:bg-[#F5F5F7] transition-colors"
                      >
                        <img
                          src={subcategoryImage(sub.slug)}
                          alt=""
                          className="h-10 w-10 object-contain shrink-0"
                          onError={onImageError}
                        />
                        <span className="text-[15px] font-medium text-black flex-1 capitalize">
                          {sub.label}
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPage({ level: "subsub", cat: page.cat, sub })}
                        className="w-full flex items-center gap-3 px-2 py-3 hover:bg-[#F5F5F7] transition-colors"
                      >
                        <img
                          src={subcategoryImage(sub.slug)}
                          alt=""
                          className="h-10 w-10 object-contain shrink-0"
                          onError={onImageError}
                        />
                        <span className="text-[15px] font-medium text-black flex-1 text-left capitalize">
                          {sub.label}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── SUBSUB PAGE ── */}
        {page.level === "subsub" && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#F0F0F0]">
              <SheetTitle asChild>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage({ level: "sub", cat: page.cat })}
                    aria-label="Back"
                    className="p-1.5 text-black hover:opacity-70"
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </button>
                  <span className="text-[17px] font-bold text-black capitalize flex-1">
                    {page.sub.label}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="p-1.5 text-black hover:opacity-70"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="px-3 py-2 space-y-0.5">
              {page.sub.children.map((ss) => (
                <Link
                  key={ss.slug}
                  {...leafLink(ss, page.sub, page.cat)}
                  onClick={close}
                  className="flex items-center gap-3 px-2 py-3 hover:bg-[#F5F5F7] transition-colors"
                >
                  <img
                    src={subSubImage(page.sub.slug, ss.slug)}
                    alt=""
                    className="h-10 w-10 object-contain shrink-0"
                    onError={onImageError}
                  />
                  <span className="text-[15px] font-medium text-black flex-1 capitalize">
                    {ss.label}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
