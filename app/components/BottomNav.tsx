"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/lib/cart";

export default function BottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const links = [
    { href: "/", label: "Inicio", icon: "⌂", active: pathname === "/" },
    { href: "/#menu", label: "Menú", icon: "☷", active: false },
    {
      href: "/cart",
      label: "Carrito",
      icon: "🛒",
      active: pathname === "/cart",
      badge: totalItems,
    },
    { href: "/#info", label: "Info", icon: "ⓘ", active: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d0d0df2] px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`relative flex min-w-14 flex-col items-center gap-1 ${
              link.active ? "text-red-500" : "text-neutral-400"
            }`}
          >
            <span className="text-xl">{link.icon}</span>

            {link.badge !== undefined && link.badge > 0 && (
              <span className="absolute -top-2 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {link.badge}
              </span>
            )}

            <span className="text-[10px] font-bold">{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
