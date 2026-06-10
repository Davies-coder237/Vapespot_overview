function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function SpecificationsTable({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;
  return (
    <dl className="overflow-hidden">
      {entries.map(([k, v], i) => (
        <div
          key={k}
          className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${
            i > 0 ? "border-t border-[#F0F0F0]" : ""
          }`}
        >
          <dt className="bg-[#F7F7F8] px-5 py-5 text-[15px] text-[#6E6E73]">
            {formatKey(k)}
          </dt>
          <dd className="bg-[#FDFCF9] px-5 py-5 text-[15px] text-black">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
