"use client";

import Link from "next/link";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../data/menu";

export default function CartButton() {
  const {
    totalItems,
    totalPrice,
  } = useCart();

  if (totalItems === 0) {
    return null;
  }

  return (
    <Link
      href="/cart"
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-red-600 px-5 py-4 shadow-2xl shadow-red-900/30 transition hover:bg-red-500 active:scale-[0.98] md:bottom-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          🛒
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">
            Tu pedido
          </p>

          <p className="text-sm font-black">
            {totalItems}{" "}
            {totalItems === 1
              ? "producto"
              : "productos"}
          </p>
        </div>
      </div>

      <span className="text-lg font-black">
        {formatPrice(totalPrice)}
      </span>
    </Link>
  );
}