"use client";

import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "../data/menu";
import { useCart } from "../context/CartContext";
import BottomNav from "../components/BottomNav";

export default function CartPage() {
  const {
    items,
    totalItems,
    totalPrice,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  return (
    <main className="min-h-screen bg-[#090909] pb-32 text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl transition hover:bg-[#1d1d1d]"
          >
            ←
          </Link>

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
              Burger House
            </p>

            <h1 className="mt-1 text-lg font-black">
              Tu pedido
            </h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-sm font-black">
            {totalItems}
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-2xl px-5 pt-7">
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            {/* TITLE */}

            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                Tu selección
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {totalItems === 1
                  ? "1 producto"
                  : `${totalItems} productos`}
              </h2>
            </div>

            {/* CART ITEMS */}

            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.cartId}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#141414]"
                >
                  <div className="flex gap-4 p-4">
                    {/* IMAGE */}

                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#0d0d0d]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    {/* INFO */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-sm font-black text-white">
                            {formatPrice(
                              item.unitPrice
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.cartId
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          ✕
                        </button>
                      </div>

                      {/* OPTIONS */}

                      {(item.options.length > 0 ||
                        item.extras.length > 0) && (
                        <div className="mt-3 space-y-1">
                          {item.options.map(
                            (option) => (
                              <p
                                key={option.id}
                                className="text-xs text-neutral-400"
                              >
                                {option.name}
                                {option.price >
                                  0 && (
                                  <span className="ml-1 text-neutral-500">
                                    +
                                    {formatPrice(
                                      option.price
                                    )}
                                  </span>
                                )}
                              </p>
                            )
                          )}

                          {item.extras.map(
                            (extra) => (
                              <p
                                key={extra.id}
                                className="text-xs text-neutral-400"
                              >
                                + {extra.name}

                                {extra.price >
                                  0 && (
                                  <span className="ml-1 text-neutral-500">
                                    +
                                    {formatPrice(
                                      extra.price
                                    )}
                                  </span>
                                )}
                              </p>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUANTITY */}

                  <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Cantidad
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(
                            item.cartId
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0f0f0f] text-lg font-black transition hover:border-white/20 active:scale-90"
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>

                      <span className="min-w-5 text-center text-sm font-black">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(
                            item.cartId
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-black transition hover:bg-red-500 active:scale-90"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ITEM TOTAL */}

                  <div className="border-t border-white/10 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Total
                      </span>

                      <span className="text-sm font-black">
                        {formatPrice(
                          item.unitPrice *
                            item.quantity
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* ORDER SUMMARY */}

            <section className="mt-7 rounded-3xl border border-white/10 bg-[#111111] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                Resumen
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">
                    Subtotal
                  </span>

                  <span className="font-bold">
                    {formatPrice(
                      totalPrice
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">
                    Delivery
                  </span>

                  <span className="font-bold text-neutral-500">
                    Se calcula después
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-bold">
                      Total
                    </span>

                    <span className="text-2xl font-black">
                      {formatPrice(
                        totalPrice
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* CONTINUE */}

            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 transition hover:bg-red-500 active:scale-[0.98]"
            >
              <span className="text-sm font-black uppercase tracking-wide">
                Continuar pedido
              </span>

              <span className="text-lg font-black">
                {formatPrice(
                  totalPrice
                )}
              </span>
            </Link>

            {/* KEEP SHOPPING */}

            <Link
              href="/"
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

function EmptyCart() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-4xl">
        🛒
      </div>

      <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-red-500">
        Tu carrito está vacío
      </p>

      <h2 className="mt-2 text-3xl font-black">
        Todavía no pediste nada
      </h2>

      <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
        Explorá nuestro menú y agregá
        tus favoritos al pedido.
      </p>

      <Link
        href="/"
        className="mt-7 rounded-full bg-red-600 px-7 py-3 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95"
      >
        Ver menú
      </Link>
    </div>
  );
}