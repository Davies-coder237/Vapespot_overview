import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ClipboardList, Send } from "lucide-react";
import { useState } from "react";
import { useMyList } from "@/lib/storage";
import { TELEGRAM_HANDLE, buildTelegramUrl, buildTelegramMessage } from "@/lib/telegram";
import { SearchDialog } from "./SearchDialog";

export function MobileBottomNav() {
  const { items } = useMyList();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (p: string) => pathname === p;

  const iconClass = (active: boolean) =>
    `h-5 w-5 ${active ? "text-[#7C3AED]" : "text-black"}`;
  const labelClass = (active: boolean) =>
    `text-[10px] mt-0.5 ${active ? "text-[#7C3AED] font-semibold" : "text-black"}`;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#F0F0F0] h-[60px] flex items-stretch">
        <Link to="/" className="flex-1 flex flex-col items-center justify-center">
          <Home className={iconClass(isActive("/"))} strokeWidth={1.75} />
          <span className={labelClass(isActive("/"))}>Home</span>
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <Search className="h-5 w-5 text-black" strokeWidth={1.75} />
          <span className="text-[10px] mt-0.5 text-black">Search</span>
        </button>
        <Link
          to="/my-list"
          className="flex-1 flex flex-col items-center justify-center relative"
        >
          <div className="relative">
            <ClipboardList
              className={iconClass(isActive("/my-list"))}
              strokeWidth={1.75}
            />
            {count > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#7C3AED] text-white text-[9px] font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <span className={labelClass(isActive("/my-list"))}>My List</span>
        </Link>
        <a
          href={buildTelegramUrl(buildTelegramMessage([]), TELEGRAM_HANDLE)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center justify-center"
        >
          <Send className="h-5 w-5 text-black" strokeWidth={1.75} />
          <span className="text-[10px] mt-0.5 text-black">Telegram</span>
        </a>
      </nav>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
