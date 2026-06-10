/**
 * Previous/Next pagination with progress bar and "Showing X of Y" text.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  totalItems,
  itemsPerPage,
}: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}) {
  if (totalPages <= 1) return null;

  const shown = Math.min((itemsPerPage ?? 50) * page, totalItems ?? page * (itemsPerPage ?? 50));
  const total = totalItems ?? totalPages * (itemsPerPage ?? 50);
  const progress = Math.round((shown / total) * 100);

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4">
      <p className="text-sm text-[#6E6E73]">
        Showing {shown} of {total}
      </p>

      <div className="w-full max-w-xs h-[3px] bg-[#E5E5E5] rounded-full overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-3 mt-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={isFirst}
          className="px-8 py-3 border border-black text-black text-[15px] font-semibold rounded-none hover:bg-black hover:text-white transition-colors disabled:border-[#C0C0C0] disabled:text-[#C0C0C0] disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#C0C0C0]"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={isLast}
          className="px-8 py-3 border border-black text-black text-[15px] font-semibold rounded-none hover:bg-black hover:text-white transition-colors disabled:border-[#C0C0C0] disabled:text-[#C0C0C0] disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#C0C0C0]"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
