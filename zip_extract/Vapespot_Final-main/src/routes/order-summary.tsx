import { createFileRoute } from "@tanstack/react-router";
import { OrderSummary } from "@/components/OrderSummary";

export const Route = createFileRoute("/order-summary")({
  head: () => ({ meta: [{ title: "Order Summary — Vape Spot" }] }),
  component: OrderSummaryPage,
});

function OrderSummaryPage() {
  return (
    <div className="py-6 space-y-4 max-w-3xl lg:max-w-2xl mx-auto">
      <div className="px-4 space-y-1">
        <h1 className="text-[28px] font-extrabold text-black">Order Summary</h1>
        <p className="text-sm text-[#6E6E73]">
          Please review your order before contacting us on Telegram.
        </p>
      </div>
      <OrderSummary />
    </div>
  );
}
