type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl">
        🔎
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar en el menú..."
        className="h-14 w-full rounded-2xl border border-white/10 bg-[#151515] pl-14 pr-5 text-sm text-white outline-none placeholder:text-neutral-500 transition focus:border-red-500/60"
      />
    </div>
  );
}