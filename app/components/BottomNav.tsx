"use client";

type BottomNavProps = {
  cartCount: number;
};

export default function BottomNav({
  cartCount,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d0d0df2] px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <button className="flex flex-col items-center gap-1 text-red-500">
          <span className="text-xl">⌂</span>
          <span className="text-[10px] font-bold">Inicio</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-neutral-400">
          <span className="text-xl">☷</span>
          <span className="text-[10px] font-bold">Menú</span>
        </button>

        <button className="relative flex flex-col items-center gap-1 text-neutral-400">
          <span className="text-xl">🛒</span>

          {cartCount > 0 && (
            <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
              {cartCount}
            </span>
          )}

          <span className="text-[10px] font-bold">Carrito</span>
        </button>

        <button className="flex flex-col items-center gap-1 text-neutral-400">
          <span className="text-xl">ⓘ</span>
          <span className="text-[10px] font-bold">Info</span>
        </button>
      </div>
    </nav>
  );
}