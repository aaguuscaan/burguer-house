"use client";

import Image from "next/image";
import Link from "next/link";

import BottomNav from "../components/BottomNav";
import { storeConfig } from "../data/store";

import { type CartItem, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { isRemoteImage } from "@/lib/images";
import { itemDetailLines } from "@/lib/order";

export default function CartPage() {
  const { items, totalItems, totalPrice } = useCart();

  return (
    <main className="min-h-screen bg-[#090909] pb-32 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            aria-label="Volver al menú"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl transition hover:bg-[#1d1d1d]"
          >
            ←
          </Link>

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
              {storeConfig.name}
            </p>

            <h1 className="mt-1 text-lg font-black">Tu pedido</h1>
          </div>

          <div
            aria-label={`${totalItems} productos`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-sm font-black"
          >
            {totalItems}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 pt-7">
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                Tu selección
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {totalItems === 1 ? "1 producto" : `${totalItems} productos`}
              </h2>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <CartLine key={item.cartId} item={item} />
              ))}
            </div>

            <section className="mt-7 rounded-3xl border border-white/10 bg-[#111111] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                Resumen
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Subtotal</span>
                  <span className="font-bold">{formatPrice(totalPrice)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Envío</span>
                  <span className="text-right font-bold text-neutral-500">
                    {totalPrice >= storeConfig.delivery.freeFrom
                      ? "Gratis"
                      : "Se calcula en el checkout"}
                  </span>
                </div>
              </div>
            </section>

            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 transition hover:bg-red-500 active:scale-[0.98]"
            >
              <span className="text-sm font-black uppercase tracking-wide">
                Continuar pedido
              </span>

              <span className="text-lg font-black">
                {formatPrice(totalPrice)}
              </span>
            </Link>

            <Link
              href="/#menu"
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#141414] px-5 py-4 text-sm font-bold text-neutral-300 transition hover:border-white/20 hover:text-white"
            >
              Seguir comprando
            </Link>
          </>
        )}
      </section>

      <BottomNav />
    </main>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const { increaseQuantity, decreaseQuantity, removeFromCart } = useCart();
  const details = itemDetailLines(item);

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#141414]">
      <div className="flex gap-4 p-4">
        <Link
          href={`/product/${item.productId}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#0d0d0d] sm:h-24 sm:w-24"
        >
          <Image
            src={item.image}
            alt={item.name}
            fill
            unoptimized={isRemoteImage(item.image)}
            sizes="96px"
            className="object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black">{item.name}</h3>

              <p className="mt-1 text-xs text-neutral-500">
                {formatPrice(item.unitPrice)} c/u
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeFromCart(item.cartId)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
              aria-label={`Eliminar ${item.name}`}
            >
              ✕
            </button>
          </div>

          {details.length > 0 && (
            <ul className="mt-3 space-y-1">
              {details.map((detail) => (
                <li
                  key={`${detail.kind}-${detail.text}`}
                  className={`break-words text-xs ${
                    detail.kind === "removed"
                      ? "font-bold text-red-300"
                      : detail.kind === "notes"
                        ? "italic text-neutral-500"
                        : "text-neutral-400"
                  }`}
                >
                  {detail.text}
                  {detail.price > 0 && (
                    <span className="ml-1 text-neutral-500">
                      (+{formatPrice(detail.price)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => decreaseQuantity(item.cartId)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0f0f0f] text-lg font-black transition hover:border-white/20 active:scale-90"
            aria-label={
              item.quantity === 1
                ? `Quitar ${item.name}`
                : `Restar un ${item.name}`
            }
          >
            {item.quantity === 1 ? "🗑" : "−"}
          </button>

          <span
            className="min-w-5 text-center text-sm font-black"
            aria-live="polite"
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseQuantity(item.cartId)}
            disabled={item.quantity >= 99}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-black transition hover:bg-red-500 active:scale-90 disabled:opacity-30"
            aria-label={`Sumar un ${item.name}`}
          >
            +
          </button>
        </div>

        <span className="text-base font-black">
          {formatPrice(item.unitPrice * item.quantity)}
        </span>
      </div>
    </article>
  );
}

function EmptyCart() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-4xl">
        🛒
      </div>

      <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-red-500">
        Tu carrito está vacío
      </p>

      <h2 className="mt-2 text-3xl font-black">Todavía no pediste nada</h2>

      <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
        Explorá nuestro menú y agregá tus favoritos al pedido.
      </p>

      <Link
        href="/#menu"
        className="mt-7 rounded-full bg-red-600 px-7 py-3 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95"
      >
        Ver menú
      </Link>
    </div>
  );
}
