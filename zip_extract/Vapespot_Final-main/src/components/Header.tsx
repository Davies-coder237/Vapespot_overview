import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, Send, Menu } from "lucide-react";
import { useState } from "react";
import { useMyList } from "@/lib/storage";
import { Sidebar } from "./Sidebar";
import { SearchDialog } from "./SearchDialog";
import { TELEGRAM_HANDLE, buildTelegramUrl, buildTelegramMessage } from "@/lib/telegram";

export function Header() {
  const { items } = useMyList();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto flex items-center px-4 md:px-6 h-[60px] md:h-[72px] gap-3">
          {/* Hamburger - left */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-1.5 text-black hover:opacity-70 transition-opacity shrink-0"
          >
            <Menu className="h-6 w-6" strokeWidth={1.75} />
          </button>

          {/* Logo - centered on mobile, left-aligned on desktop */}
          <Link
            to="/"
            aria-label="Vape Spot"
            className="flex items-center md:order-none order-none md:mr-2 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          >
            <img
              src="/images/logo-vapespot.webp"
              alt="Vape Spot"
              className="h-7 md:h-9 w-auto"
            />
          </Link>

          {/* Search bar - desktop only */}
          <div className="hidden md:flex flex-1 justify-center px-6">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full max-w-xl flex items-center gap-3 h-11 px-4 rounded-full bg-[#F5F5F7] text-sm text-[#6E6E73] hover:bg-[#ECECEF] transition-colors"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              <span>Search for products, brands…</span>
            </button>
          </div>

          {/* Right icons */}
          <div className="flex items-center ml-auto gap-1">
            {/* Cart - visible on all screens */}
            <Link
              to="/my-list"
              aria-label="My List"
              className="relative p-2 md:px-3 md:py-2 flex items-center gap-1.5 text-black hover:opacity-70 transition-opacity"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
              <span className="hidden md:inline text-sm font-medium">My List</span>
              {count > 0 && (
                <span className="absolute -top-0.5 right-0 md:static md:ml-1 min-w-[20px] h-[20px] px-1 rounded-full bg-black text-white text-[11px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {/* Telegram - desktop only */}
            <a
              href={buildTelegramUrl(buildTelegramMessage([]), TELEGRAM_HANDLE)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="hidden md:flex p-2 md:px-3 md:py-2 items-center gap-1.5 text-black hover:opacity-70 transition-opacity"
            >
              <Send className="h-5 w-5" strokeWidth={1.75} />
              <span className="hidden md:inline text-sm font-medium">Telegram</span>
            </a>
          </div>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
