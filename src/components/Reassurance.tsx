import { Truck, ShieldCheck, BadgeCheck, Send } from "lucide-react";

const BLOCKS = [
  {
    icon: Truck,
    title: "Fast Delivery",
    subtitle: "1-3 business days to all states.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    subtitle: "PayID & Bank Transfer accepted.",
  },
  {
    icon: BadgeCheck,
    title: "100% Authentic",
    subtitle: "Genuine products from top brands.",
  },
  {
    icon: Send,
    title: "Telegram Support",
    subtitle: "Chat with us 24/7 on Telegram.",
  },
];

export function Reassurance() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-[2px] bg-[#E0DAFF]">
      {BLOCKS.map((b) => {
        const Icon = b.icon;
        return (
          <div
            key={b.title}
            className="bg-[#F0EEFF] flex flex-col items-start gap-3 p-5 lg:p-8"
          >
            <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-[#DDD6FF] flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-[#5B3DF5]" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[15px] lg:text-[18px] font-bold text-black leading-tight">
                {b.title}
              </p>
              <p className="text-[13px] lg:text-[15px] text-[#6E6E73] mt-1 leading-snug">
                {b.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
