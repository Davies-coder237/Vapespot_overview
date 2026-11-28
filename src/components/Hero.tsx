import { MessageCircle } from "lucide-react";
import { openChat } from "@/lib/chat";

export function Hero() {
  return (
    <section className="relative w-full">
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/cat/Hero-desktop.webp" />
        <img
          src="/images/cat/Hero-mobile.webp"
          alt="Vape Spot catalogue"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-auto block aspect-[6/13] md:aspect-[2/1]"
        />
      </picture>

      {/* Mobile: between vapes and reassurance | Desktop: left side, at reassurance level */}
      <div className="absolute inset-x-0 bottom-[17.5%] md:bottom-[8%] flex justify-center px-6 md:inset-x-auto md:left-12 md:justify-start">
        <button
          type="button"
          onClick={openChat}
          className="inline-flex items-center gap-2 bg-black text-white font-semibold rounded-none px-8 py-4 hover:opacity-90 transition-opacity text-sm md:text-base"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          Chat with us
        </button>
      </div>
    </section>
  );
}
