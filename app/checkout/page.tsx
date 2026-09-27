"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatPrice } from "../data/menu";
import { storeConfig } from "../data/store";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";

type OrderType = "delivery" | "pickup";

type PaymentMethod =
  | "cash"
  | "transfer"
  | "card";

const RESTAURANT_ID =
  "926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

export default function CheckoutPage() {
  const {
    items,
    totalPrice,
    clearCart,
  } = useCart();

  const [orderType, setOrderType] =
    useState<OrderType>("delivery");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [deliveryZone, setDeliveryZone] =
    useState<
      "unknown" | "valid" | "invalid"
    >("unknown");

  const [orderNumber, setOrderNumber] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const simulatedDistance = 3.2;

  const isDeliveryAvailable =
    simulatedDistance <=
    storeConfig.delivery.radiusKm;

  const deliveryCost =
    orderType === "delivery"
      ? totalPrice >=
        storeConfig.delivery.freeFrom
        ? 0
        : storeConfig.delivery.baseCost
      : 0;

  const finalTotal =
    totalPrice + deliveryCost;

  const paymentLabel = useMemo(() => {
    if (paymentMethod === "cash") {
      return "Efectivo";
    }

    if (paymentMethod === "transfer") {
      return "Transferencia";
    }

    return "Tarjeta";
  }, [paymentMethod]);

  const canContinue =
    !saving &&
    items.length > 0 &&
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    (orderType === "pickup" ||
      (address.trim().length >= 5 &&
        deliveryZone === "valid"));

  const checkDeliveryZone = () => {
    if (!address.trim()) {
      setDeliveryZone("unknown");
      return;
    }

    if (isDeliveryAvailable) {
      setDeliveryZone("valid");
    } else {
      setDeliveryZone("invalid");
    }
  };

  /*
   * =========================================================
   * CREAR PEDIDO
   * =========================================================
   */

  const handleSubmit = async () => {
    if (!canContinue) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newOrderNumber = `BH-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      /*
       * ========================================
       * ARMAR ITEMS PARA SUPABASE
       * ========================================
       */

      const supabaseItems = items.map(
        (item) => {
          const options = item.options.map(
            (option) => ({
              option_name:
                "Opción",
              option_value:
                option.name,
              price:
                option.price,
            })
          );

          const extras = item.extras.map(
            (extra) => ({
              option_name:
                "Extra",
              option_value:
                extra.name,
              price:
                extra.price,
            })
          );

          const removedIngredients =
            item.removedIngredients.map(
              (ingredient) => ({
                option_name:
                  "Ingrediente",
                option_value:
                  `SIN ${ingredient}`,
                price: 0,
              })
            );

          const itemNotes =
            item.notes.trim()
              ? [
                  {
                    option_name:
                      "Observación",
                    option_value:
                      item.notes.trim(),
                    price: 0,
                  },
                ]
              : [];

          return {
            product_id:
              item.productId,

            product_name:
              item.name,

            quantity:
              item.quantity,

            unit_price:
              item.unitPrice,

            total_price:
              item.unitPrice *
              item.quantity,

            options: [
              ...options,
              ...extras,
              ...removedIngredients,
              ...itemNotes,
            ],
          };
        }
      );

      /*
       * ========================================
       * DATOS DEL PEDIDO
       * ========================================
       */

      const orderData = {
        restaurant_id:
          RESTAURANT_ID,

        order_number:
          newOrderNumber,

        customer_name:
          name.trim(),

        customer_phone:
          phone.trim(),

        customer_address:
          orderType === "delivery"
            ? address.trim()
            : null,

        order_type:
          orderType === "delivery"
            ? "Delivery"
            : "Retiro",

        payment_method:
          paymentMethod,

        status:
          "NUEVO",

        subtotal:
          totalPrice,

        delivery_fee:
          deliveryCost,

        discount:
          0,

        total:
          finalTotal,

        notes:
          notes.trim(),
      };

      console.log(
        "========== CREANDO PEDIDO =========="
      );

      /*
       * ========================================
       * RPC ATÓMICA
       * ========================================
       *
       * La función crea:
       *
       * orders
       *    ↓
       * order_items
       *    ↓
       * order_item_options
       *
       * Si algo falla, la transacción
       * completa se revierte.
       */

      const {
        data: createdOrderId,
        error: orderError,
      } = await supabase.rpc(
        "create_burger_house_order",
        {
          p_order:
            orderData,

          p_items:
            supabaseItems,
        }
      );

      if (orderError) {
        console.error(
          "ERROR CREANDO PEDIDO:",
          orderError
        );

        throw new Error(
          orderError.message ||
            "No se pudo guardar el pedido."
        );
      }

      if (!createdOrderId) {
        throw new Error(
          "Supabase no devolvió el ID del pedido."
        );
      }

      console.log(
        "========== PEDIDO CREADO =========="
      );

      console.log(
        "ID:",
        createdOrderId
      );

      console.log(
        "Número:",
        newOrderNumber
      );

      /*
       * Solamente llegamos acá si:
       *
       * orders ✓
       * order_items ✓
       * order_item_options ✓
       */

      setOrderNumber(
        newOrderNumber
      );

    } catch (err) {
      console.error(
        "ERROR FINAL:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el pedido."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =========================================================
   * WHATSAPP
   * =========================================================
   */

  const handleWhatsApp = () => {
    if (!orderNumber) {
      return;
    }

    const lines: string[] = [];

    lines.push(
      "BURGER HOUSE"
    );

    lines.push(
      "━━━━━━━━━━━━━━━━━━"
    );

    lines.push(
      `PEDIDO #${orderNumber}`
    );

    lines.push("");

    lines.push("CLIENTE");

    lines.push(name);

    lines.push(phone);

    lines.push("");

    if (
      orderType ===
      "delivery"
    ) {
      lines.push("DELIVERY");

      lines.push(address);

      lines.push(
        `Costo de envío: ${
          deliveryCost === 0
            ? "GRATIS"
            : formatPrice(
                deliveryCost
              )
        }`
      );
    } else {
      lines.push(
        "RETIRO EN LOCAL"
      );
    }

    lines.push("");

    lines.push("PEDIDO");

    items.forEach(
      (item) => {
        lines.push(
          `${item.quantity}x ${item.name} — ${formatPrice(
            item.unitPrice *
              item.quantity
          )}`
        );

        item.options.forEach(
          (option) => {
            lines.push(
              `   • ${option.name}`
            );
          }
        );

        item.extras.forEach(
          (extra) => {
            lines.push(
              `   • + ${extra.name}`
            );
          }
        );

        item.removedIngredients.forEach(
          (ingredient) => {
            lines.push(
              `   • SIN ${ingredient}`
            );
          }
        );

        if (
          item.notes.trim()
        ) {
          lines.push(
            `   • Observación: ${item.notes}`
          );
        }

        lines.push("");
      }
    );

    lines.push(
      `Subtotal: ${formatPrice(
        totalPrice
      )}`
    );

    if (
      orderType ===
      "delivery"
    ) {
      lines.push(
        `Delivery: ${
          deliveryCost === 0
            ? "GRATIS"
            : formatPrice(
                deliveryCost
              )
        }`
      );
    }

    lines.push(
      `TOTAL: ${formatPrice(
        finalTotal
      )}`
    );

    lines.push(
      `Pago: ${paymentLabel}`
    );

    if (notes.trim()) {
      lines.push("");

      lines.push(
        `Notas: ${notes}`
      );
    }

    lines.push("");

    lines.push(
      "━━━━━━━━━━━━━━━━━━"
    );

    const message =
      lines.join("\n");

    const whatsappUrl =
      `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappUrl,
      "_blank"
    );

    clearCart();
  };

  /*
   * =========================================================
   * CARRITO VACÍO
   * =========================================================
   */

  if (
    items.length === 0 &&
    !orderNumber
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-4xl">
            🛒
          </div>

          <h1 className="mt-6 text-3xl font-black">
            Tu carrito está vacío
          </h1>

          <p className="mt-3 text-sm text-neutral-500">
            Agregá productos antes de
            continuar.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-red-600 px-7 py-3 text-sm font-black uppercase tracking-wide"
          >
            Ver menú
          </Link>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * PEDIDO CREADO
   * =========================================================
   */

  if (orderNumber) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 pb-10 text-white">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-4xl shadow-2xl shadow-red-950/50">
              ✓
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.3em] text-red-500">
              Pedido creado
            </p>

            <h1 className="mt-2 text-4xl font-black">
              ¡Listo!
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              Tu número de pedido es
            </p>

            <div className="mt-3 inline-flex rounded-2xl border border-white/10 bg-[#141414] px-6 py-4">
              <span className="text-2xl font-black">
                {orderNumber}
              </span>
            </div>
          </div>

          <section className="mt-10 rounded-3xl border border-white/10 bg-[#141414] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
              Resumen
            </p>

            <div className="mt-5 space-y-4">
              {items.map(
                (item) => (
                  <div
                    key={
                      item.cartId
                    }
                    className="flex justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-bold">
                        {
                          item.quantity
                        }
                        x{" "}
                        {
                          item.name
                        }
                      </p>

                      {item.options.map(
                        (
                          option
                        ) => (
                          <p
                            key={
                              option.id
                            }
                            className="mt-1 text-xs text-neutral-500"
                          >
                            {
                              option.name
                            }
                          </p>
                        )
                      )}

                      {item.extras.map(
                        (
                          extra
                        ) => (
                          <p
                            key={
                              extra.id
                            }
                            className="mt-1 text-xs text-neutral-500"
                          >
                            +{" "}
                            {
                              extra.name
                            }
                          </p>
                        )
                      )}

                      {item.removedIngredients.map(
                        (
                          ingredient
                        ) => (
                          <p
                            key={
                              ingredient
                            }
                            className="mt-1 text-xs text-neutral-500"
                          >
                            SIN{" "}
                            {
                              ingredient
                            }
                          </p>
                        )
                      )}
                    </div>

                    <span className="font-black">
                      {formatPrice(
                        item.unitPrice *
                          item.quantity
                      )}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex justify-between text-sm text-neutral-400">
                <span>
                  Subtotal
                </span>

                <span>
                  {formatPrice(
                    totalPrice
                  )}
                </span>
              </div>

              {orderType ===
                "delivery" && (
                <div className="mt-2 flex justify-between text-sm text-neutral-400">
                  <span>
                    Delivery
                  </span>

                  <span>
                    {deliveryCost ===
                    0
                      ? "GRATIS"
                      : formatPrice(
                          deliveryCost
                        )}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-end justify-between">
                <span className="font-bold">
                  Total
                </span>

                <span className="text-2xl font-black">
                  {formatPrice(
                    finalTotal
                  )}
                </span>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={
              handleWhatsApp
            }
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-black uppercase tracking-wide text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Enviar pedido por WhatsApp
          </button>

          <Link
            href="/"
            className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#141414] px-5 py-4 text-sm font-bold text-neutral-300"
          >
            Volver al menú
          </Link>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * CHECKOUT
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#090909] pb-10 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link
            href="/cart"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl"
          >
            ←
          </Link>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              {storeConfig.name}
            </p>

            <h1 className="text-lg font-black">
              Finalizar pedido
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 pt-7">

        {/* ENTREGA */}

        <section>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            01 · Entrega
          </p>

          <h2 className="mt-1 text-2xl font-black">
            ¿Cómo querés recibirlo?
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setOrderType(
                  "delivery"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                orderType ===
                "delivery"
                  ? "border-red-600 bg-red-600/10"
                  : "border-white/10 bg-[#141414]"
              }`}
            >
              <span className="text-2xl">
                🛵
              </span>

              <p className="mt-3 text-sm font-black">
                Delivery
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Radio de{" "}
                {
                  storeConfig
                    .delivery
                    .radiusKm
                }{" "}
                km
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setOrderType(
                  "pickup"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                orderType ===
                "pickup"
                  ? "border-red-600 bg-red-600/10"
                  : "border-white/10 bg-[#141414]"
              }`}
            >
              <span className="text-2xl">
                🏪
              </span>

              <p className="mt-3 text-sm font-black">
                Retiro
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Retirá en el local
              </p>
            </button>
          </div>
        </section>

        {/* DATOS */}

        <section className="mt-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            02 · Tus datos
          </p>

          <h2 className="mt-1 text-2xl font-black">
            ¿A quién esperamos?
          </h2>

          <div className="mt-5 space-y-4">

            <Input
              label="Nombre"
              placeholder="Ej. Agustina"
              value={name}
              onChange={setName}
            />

            <Input
              label="Teléfono"
              placeholder="Ej. 11 1234 5678"
              type="tel"
              value={phone}
              onChange={setPhone}
            />

            {orderType ===
              "delivery" && (
              <>
                <Input
                  label="Dirección"
                  placeholder="Calle y número"
                  value={address}
                  onChange={(
                    value
                  ) => {
                    setAddress(
                      value
                    );

                    setDeliveryZone(
                      "unknown"
                    );
                  }}
                />

                <button
                  type="button"
                  onClick={
                    checkDeliveryZone
                  }
                  disabled={
                    !address.trim()
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm font-black transition hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Verificar zona de
                  delivery
                </button>

                {deliveryZone ===
                  "valid" && (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                    <p className="text-sm font-black text-green-400">
                      ✓ Estamos dentro
                      de tu zona
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Distancia
                      estimada:{" "}
                      {
                        simulatedDistance
                      }{" "}
                      km
                    </p>
                  </div>
                )}

                {deliveryZone ===
                  "invalid" && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm font-black text-red-400">
                      × Fuera de nuestra
                      zona
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Realizamos
                      delivery hasta{" "}
                      {
                        storeConfig
                          .delivery
                          .radiusKm
                      }{" "}
                      km.
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Notas
              </label>

              <textarea
                value={notes}
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target
                      .value
                  )
                }
                placeholder="Alguna indicación para tu pedido..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-red-600"
              />
            </div>

          </div>
        </section>

        {/* PAGO */}

        <section className="mt-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            03 · Pago
          </p>

          <h2 className="mt-1 text-2xl font-black">
            ¿Cómo vas a pagar?
          </h2>

          <div className="mt-5 space-y-2">

            <PaymentButton
              selected={
                paymentMethod ===
                "cash"
              }
              icon="💵"
              title="Efectivo"
              description="Pagás al recibir"
              onClick={() =>
                setPaymentMethod(
                  "cash"
                )
              }
            />

            <PaymentButton
              selected={
                paymentMethod ===
                "transfer"
              }
              icon="🏦"
              title="Transferencia"
              description="Te mostramos los datos al confirmar"
              onClick={() =>
                setPaymentMethod(
                  "transfer"
                )
              }
            />

            <PaymentButton
              selected={
                paymentMethod ===
                "card"
              }
              icon="💳"
              title="Tarjeta"
              description="Pagás al recibir"
              onClick={() =>
                setPaymentMethod(
                  "card"
                )
              }
            />

          </div>
        </section>

        {/* RESUMEN */}

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#141414] p-5">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
            04 · Resumen
          </p>

          <div className="mt-5 space-y-3">

            {items.map(
              (item) => (
                <div
                  key={
                    item.cartId
                  }
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-neutral-400">
                    {
                      item.quantity
                    }
                    x{" "}
                    {
                      item.name
                    }
                  </span>

                  <span className="font-bold">
                    {formatPrice(
                      item.unitPrice *
                        item.quantity
                    )}
                  </span>
                </div>
              )
            )}

            <div className="border-t border-white/10 pt-4">

              <div className="flex justify-between text-sm text-neutral-400">
                <span>
                  Subtotal
                </span>

                <span>
                  {formatPrice(
                    totalPrice
                  )}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-sm text-neutral-400">

                <span>
                  {orderType ===
                  "delivery"
                    ? "Delivery"
                    : "Retiro"}
                </span>

                <span>
                  {orderType ===
                  "delivery"
                    ? deliveryCost ===
                      0
                      ? "GRATIS"
                      : formatPrice(
                          deliveryCost
                        )
                    : "Gratis"}
                </span>

              </div>

              {orderType ===
                "delivery" &&
                totalPrice <
                  storeConfig
                    .delivery
                    .freeFrom && (
                  <p className="mt-2 text-xs text-neutral-600">
                    Delivery gratis
                    desde{" "}
                    {formatPrice(
                      storeConfig
                        .delivery
                        .freeFrom
                    )}
                  </p>
                )}

              <div className="mt-4 flex items-end justify-between">

                <span className="font-bold">
                  Total
                </span>

                <span className="text-2xl font-black">
                  {formatPrice(
                    finalTotal
                  )}
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">

            <p className="text-sm font-black text-red-400">
              No se pudo guardar el
              pedido.
            </p>

            <p className="mt-1 text-xs text-red-300/70">
              {error}
            </p>

          </div>
        )}

        {/* CONFIRMAR */}

        <button
          type="button"
          disabled={!canContinue}
          onClick={
            handleSubmit
          }
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >

          <span className="text-sm font-black uppercase tracking-wide">
            {saving
              ? "Guardando pedido..."
              : "Confirmar pedido"}
          </span>

          <span className="text-lg font-black">
            {formatPrice(
              finalTotal
            )}
          </span>

        </button>

        {!canContinue &&
          !saving && (
            <p className="mt-3 text-center text-xs text-neutral-600">
              Completá los datos
              obligatorios para
              continuar.
            </p>
          )}

      </section>
    </main>
  );
}

/*
 * =========================================================
 * INPUT
 * =========================================================
 */

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-red-600"
      />
    </div>
  );
}

/*
 * =========================================================
 * PAYMENT BUTTON
 * =========================================================
 */

function PaymentButton({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-red-600 bg-red-600/10"
          : "border-white/10 bg-[#141414]"
      }`}
    >
      <span className="text-2xl">
        {icon}
      </span>

      <div className="flex-1">
        <p className="text-sm font-black">
          {title}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {description}
        </p>
      </div>

      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          selected
            ? "border-red-500 bg-red-500"
            : "border-white/20"
        }`}
      >
        {selected && (
          <span className="h-2 w-2 rounded-full bg-white" />
        )}
      </span>
    </button>
  );
}