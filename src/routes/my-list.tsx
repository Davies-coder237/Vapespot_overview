import { createFileRoute } from "@tanstack/react-router";
import { MyList } from "@/components/MyList";
import { useMyList } from "@/lib/storage";

export const Route = createFileRoute("/my-list")({
  head: () => ({ meta: [{ title: "My List — Vape Spot" }] }),
  component: MyListPage,
});

function MyListPage() {
  const { items } = useMyList();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className="py-6 space-y-4 max-w-3xl mx-auto">
      <div className="px-4 space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-[32px] font-extrabold text-black">My List</h1>
          {count > 0 && (
            <span className="h-9 w-9 rounded-full bg-black text-white text-base font-semibold flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        <p className="text-sm text-[#6E6E73]">Your saved products</p>
      </div>
      <MyList />
    </div>
  );
}
