import type { MenuCategory } from "@/lib/types";

type CategoryCardProps = {
  category: MenuCategory;
  active?: boolean;
  onClick?: () => void;
};

export default function CategoryCard({
  category,
  active,
  onClick,
}: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-[92px] flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition active:scale-95 ${
        active
          ? "border-red-600 bg-red-600 text-white"
          : "border-white/10 bg-[#141414] text-neutral-300 hover:border-white/20"
      }`}
    >
      <span className="text-2xl">{category.icon}</span>

      <span className="whitespace-nowrap text-xs font-bold">
        {category.name}
      </span>
    </button>
  );
}
