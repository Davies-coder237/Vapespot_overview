import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send, ShieldAlert, Wallet, Landmark, Lock, Timer, Zap, Truck, MapPin, Bitcoin } from "lucide-react";
import { findProduct, formatPrice, onImageError, productCard } from "@/lib/data";
import { useMyList } from "@/lib/storage";
import type { Product } from "@/lib/types";
import {
  buildOrderLines,
  buildTelegramMessage,
  buildTelegramUrl,
  lineTotal,
  ordersTotal,
} from "@/lib/telegram";

export function OrderSummary() {
  const { items } = useMyList();
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all(items.map((i) => findProduct(i.productId))).then((list) => {
      if (!cancelled) setProducts(list.filter((p): p is Product => p !== null));
    });
    return () => { cancelled = true; };
  }, [items]);

  const lines = buildOrderLines(items, products);
  const url = buildTelegramUrl(buildTelegramMessage(lines, deliveryAddress));

  if (lines.length === 0) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <p className="text-[#6E6E73]">Nothing to order yet.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center bg-black text-white rounded-none px-5 py-3 font-semibold"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-6">

      {/* ── Your Products ── */}
      <div className="bg-white border border-[#E8E8E8] p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-bold text-black text-[15px]">Your Products</h2>
          <span className="text-xs text-[#9E9E9E]">({lines.length} {lines.length === 1 ? "item" : "items"})</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-[11px] text-[#9E9E9E] uppercase tracking-wide pb-2 border-b border-[#F0F0F0]">
          <span>Product</span>
          <span className="text-right">Price</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Total</span>
        </div>

        <ul>
          {lines.map((l, i) => {
            return (
              <li
                key={l.product.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-3 ${
                  i < lines.length - 1 ? "border-b border-[#F0F0F0]" : ""
                }`}
              >
                {/* Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[52px] h-[52px] lg:w-[70px] lg:h-[70px] shrink-0">
                    <img
                      src={productCard(l.product)}
                      alt={l.product.name}
                      onError={onImageError}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[14px] lg:text-[16px] font-semibold text-black leading-tight line-clamp-2 min-w-0">
                    {l.product.name}
                  </p>
                </div>

                {/* Price */}
                <span className="text-right text-[13px] lg:text-[15px] text-[#6E6E73] whitespace-nowrap">
                  {formatPrice(l.product.price_aud)}
                </span>

                {/* Qty */}
                <span className="text-center text-[13px] lg:text-[15px] text-[#6E6E73] whitespace-nowrap">
                  × {l.quantity}
                </span>

                {/* Line total */}
                <span className="text-right text-[14px] lg:text-[15px] font-bold text-black whitespace-nowrap">
                  {formatPrice(lineTotal(l))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Estimated Total ── */}
      <div className="bg-white border border-[#E8E8E8] p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-black text-[15px]">Estimated Total</p>
          <p className="text-xs text-[#6E6E73] mt-0.5">Including products only</p>
        </div>
        <p className="text-[26px] font-extrabold text-black leading-none">
          {formatPrice(ordersTotal(lines))}
          <span className="ml-1.5 text-[14px] font-bold text-[#6E6E73]">AUD</span>
        </p>
      </div>

      {/* ── Payment notice ── */}
      <div className="bg-[#F0EEFF] p-5 md:p-7 lg:p-8 space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3 md:gap-4 lg:gap-5">
          <ShieldAlert className="h-6 w-6 md:h-8 md:w-8 lg:h-9 lg:w-9 text-[#5B3DF5] shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-[#5B3DF5] text-[17px] md:text-[20px] lg:text-[22px] leading-tight">
              Payment is required before delivery.
            </p>
            <p className="text-[13px] md:text-[15px] lg:text-[16px] text-[#6E6E73] mt-1.5 leading-snug">
              Your order will be processed after payment confirmation.
            </p>
          </div>
        </div>

        {/* ── Fast & Reliable Delivery card ── */}
        <div className="bg-[#F9F7FF] border border-[#E4DEFF] rounded-xl px-4 py-3.5 md:px-6 md:py-5 lg:px-7 lg:py-6 flex items-center gap-4 md:gap-6 lg:gap-7">
          {/* Left — icon */}
          <div className="shrink-0 h-12 w-12 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px] rounded-full bg-[#EDE9FF] flex items-center justify-center">
            <Timer className="h-[22px] w-[22px] md:h-8 md:w-8 lg:h-9 lg:w-9 text-[#5B3DF5]" strokeWidth={1.75} />
          </div>

          {/* Right — content */}
          <div className="flex-1 min-w-0 space-y-2 md:space-y-3">
            <p className="text-[13.5px] md:text-[16px] lg:text-[18px] font-extrabold text-[#0A0A0A] tracking-tight whitespace-nowrap">
              Fast &amp; Reliable Delivery
            </p>

            <div className="space-y-1.5 md:space-y-2">
              {/* Local */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-7 md:w-7 rounded-full bg-[#EDE9FF] flex items-center justify-center shrink-0">
                  <Zap className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-[#5B3DF5]" fill="#5B3DF5" strokeWidth={0} />
                </div>
                <div className="min-w-0">
                  <span className="text-[12px] md:text-[14px] lg:text-[15px] font-semibold text-[#2D2D2D]">Local area :</span>
                  <span className="text-[12px] md:text-[14px] lg:text-[15px] font-bold text-[#5B3DF5]">within 1 hour</span>
                </div>
              </div>

              {/* Separator */}
              <div className="ml-7 md:ml-10 h-px bg-[#EDE9FF]" />

              {/* Nationwide */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-5 w-5 md:h-7 md:w-7 rounded-full bg-[#EDE9FF] flex items-center justify-center shrink-0">
                  <Truck className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-[#5B3DF5]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span className="text-[12px] md:text-[14px] lg:text-[15px] font-semibold text-[#2D2D2D]">Nationwide :</span>
                  <span className="text-[12px] md:text-[14px] lg:text-[15px] font-bold text-[#5B3DF5]">1–3 business days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Delivery address ── */}
        <div className="bg-[#F9F7FF] border border-[#E4DEFF] rounded-xl px-4 py-3.5 md:px-6 md:py-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-10 w-10 rounded-full bg-[#EDE9FF] flex items-center justify-center">
              <MapPin className="h-5 w-5 text-[#5B3DF5]" strokeWidth={1.75} />
            </div>
            <p className="text-[14px] md:text-[16px] font-extrabold text-[#0A0A0A]">
              Enter your delivery address
            </p>
          </div>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Street, City, State, Postcode"
            rows={2}
            className="w-full text-[13px] md:text-[14px] border border-[#E4DEFF] bg-white rounded-lg px-3 py-2 text-black placeholder:text-[#C4B8F0] focus:outline-none focus:border-[#7C3AED] resize-none"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-[#DDD6FF]" />

        {/* ── Processed immediately ── */}
        <div className="flex items-start gap-3 md:gap-4">
          <div className="shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-full bg-[#EDE9FF] flex items-center justify-center">
            <Zap className="h-5 w-5 md:h-6 md:w-6 text-[#5B3DF5]" fill="#5B3DF5" strokeWidth={0} />
          </div>
          <p className="text-[13px] md:text-[15px] text-[#2D2D2D] leading-snug mt-2">
            Your order will be <span className="font-bold text-[#5B3DF5]">processed immediately</span> after payment confirmation.
          </p>
        </div>

        {/* Methods */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <div className="flex items-center gap-1.5 md:gap-4">
            <div className="h-9 w-9 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px] rounded-full bg-[#DDD6FF] flex items-center justify-center text-[#5B3DF5] shrink-0">
              <Wallet className="h-4 w-4 md:h-8 md:w-8 lg:h-9 lg:w-9" />
            </div>
            <div>
              <p className="text-[12px] md:text-[17px] lg:text-[19px] font-bold text-black">PayID</p>
              <p className="text-[10px] md:text-[13px] lg:text-[14px] text-[#6E6E73]">Accepted</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-4">
            <div className="h-9 w-9 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px] rounded-full bg-[#DDD6FF] flex items-center justify-center text-[#5B3DF5] shrink-0">
              <Landmark className="h-4 w-4 md:h-8 md:w-8 lg:h-9 lg:w-9" />
            </div>
            <div>
              <p className="text-[12px] md:text-[17px] lg:text-[19px] font-bold text-black">Bank Transfer</p>
              <p className="text-[10px] md:text-[13px] lg:text-[14px] text-[#6E6E73]">Accepted</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-4">
            <div className="h-9 w-9 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px] rounded-full bg-[#DDD6FF] flex items-center justify-center text-[#5B3DF5] shrink-0">
              <Bitcoin className="h-4 w-4 md:h-8 md:w-8 lg:h-9 lg:w-9" />
            </div>
            <div>
              <p className="text-[12px] md:text-[17px] lg:text-[19px] font-bold text-black">Crypto</p>
              <p className="text-[10px] md:text-[13px] lg:text-[14px] text-[#6E6E73]">Accepted</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Telegram CTA ── */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 bg-black text-white rounded-none py-5 text-[16px] font-bold hover:opacity-90 transition-opacity"
      >
        <Send className="h-4 w-4" strokeWidth={2} />
        Contact us on Telegram
      </a>

      <div className="flex items-center justify-center gap-1.5 text-xs text-[#9E9E9E]">
        <Lock className="h-3 w-3" />
        We'll receive your list on Telegram and confirm your order.
      </div>
    </div>
  );
}
