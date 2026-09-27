"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import {
  type OrderType,
  type PaymentMethod,
  orderTypeLabels,
  paymentMethodLabels,
  storeConfig,
} from "../data/store";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import {
  type ConfirmedOrder,
  type CustomerData,
  GENERIC_ORDER_ERROR,
  buildOrderPayload,
  estimateDeliveryFee,
  itemDetailLines,
  orderErrorMessage,
  parseSavedOrder,
  savedOptionText,
  whatsAppUrl,
} from "@/lib/order";
import { supabase } from "@/lib/supabase";

const NOTES_MAX_LENGTH = 500;

type FieldErrors = {
  orderType: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  paymentMethod: string | null;
};

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "orderType",
  "name",
  "phone",
  "address",
  "paymentMethod",
];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();

  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [notes, setNotes] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);

  /* ---------------- Pedido confirmado ------------------------------ */

  if (confirmed) {
    return <OrderConfirmation order={confirmed} />;
  }

  /* ---------------- Carrito vacío ---------------------------------- */

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-4xl">
            🛒
          </div>

          <h1 className="mt-6 text-3xl font-black">Tu carrito está vacío</h1>

          <p className="mt-3 text-sm text-neutral-500">
            Agregá productos antes de continuar.
          </p>

          <Link
            href="/#menu"
            className="mt-7 inline-flex rounded-full bg-red-600 px-7 py-3 text-sm font-black uppercase tracking-wide"
          >
            Ver menú
          </Link>
        </div>
      </main>
    );
  }

  /* ---------------- Derivados -------------------------------------- */

  const deliveryFee = estimateDeliveryFee(orderType, totalPrice);
  const total = totalPrice + deliveryFee;
  const phoneDigits = phone.replace(/\D/g, "").length;

  const errors: FieldErrors = {
    orderType: orderType ? null : "Elegí delivery o retiro.",
    name: name.trim().length >= 2 ? null : "Ingresá tu nombre.",
    phone:
      phoneDigits >= 8 && phoneDigits <= 15
        ? null
        : "Ingresá un teléfono válido, con código de área.",
    address:
      orderType !== "delivery" || address.trim().length >= 5
        ? null
        : "Ingresá calle y número.",
    paymentMethod: paymentMethod ? null : "Elegí cómo vas a pagar.",
  };

  const firstError = FIELD_ORDER.find((field) => errors[field] !== null);
  const visibleError = (field: keyof FieldErrors) =>
    showErrors ? errors[field] : null;

  /* ---------------- Confirmar -------------------------------------- */

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    setSubmitError(null);

    if (firstError || !orderType || !paymentMethod) {
      setShowErrors(true);

      document
        .getElementById(`field-${firstError ?? "orderType"}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      return;
    }

    const reference = addressReference.trim();

    const customer: CustomerData = {
      name: name.trim(),
      phone: phone.trim(),
      address:
        orderType === "delivery"
          ? reference
            ? `${address.trim()} (${reference})`
            : address.trim()
          : null,
      notes: notes.trim(),
      orderType,
      paymentMethod,
    };

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_burger_house_order",
        buildOrderPayload(customer, items)
      );

      if (error) {
        console.error("Error creando el pedido:", error);
        setSubmitError(orderErrorMessage(error.message));
        return;
      }

      const saved = parseSavedOrder(data);

      if (!saved) {
        console.error("Respuesta inesperada al crear el pedido:", data);
        setSubmitError(GENERIC_ORDER_ERROR);
        return;
      }

      setConfirmed({ ...saved, customer });
      clearCart();
      window.scrollTo({ top: 0 });
    } catch (error) {
      console.error("Error inesperado creando el pedido:", error);
      setSubmitError(GENERIC_ORDER_ERROR);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI --------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#090909] pb-10 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link
            href="/cart"
            aria-label="Volver al carrito"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl"
          >
            ←
          </Link>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              {storeConfig.name}
            </p>

            <h1 className="text-lg font-black">Finalizar pedido</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-7">
        {/* 01 · ENTREGA */}

        <Step number="01" title="Entrega" heading="¿Cómo querés recibirlo?">
          <div id="field-orderType" className="grid scroll-mt-24 grid-cols-2 gap-3">
            <ChoiceCard
              selected={orderType === "delivery"}
              hasError={visibleError("orderType") !== null}
              icon="🛵"
              title="Delivery"
              description={`Hasta ${storeConfig.delivery.radiusKm} km`}
              onClick={() => setOrderType("delivery")}
            />

            <ChoiceCard
              selected={orderType === "pickup"}
              hasError={visibleError("orderType") !== null}
              icon="🏪"
              title="Retiro"
              description="En el local, sin cargo"
              onClick={() => setOrderType("pickup")}
            />
          </div>

          <FieldError message={visibleError("orderType")} />

          {orderType === "delivery" && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-[#111111] p-4 text-xs leading-5 text-neutral-400">
              Llegamos hasta {storeConfig.delivery.radiusKm} km del local.
              Envío {formatPrice(storeConfig.delivery.baseCost)}, gratis desde{" "}
              {formatPrice(storeConfig.delivery.freeFrom)}. Si tu dirección
              queda fuera de la zona, te avisamos por WhatsApp antes de
              preparar el pedido.
            </p>
          )}

          {orderType === "pickup" && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-[#111111] p-4 text-xs leading-5 text-neutral-400">
              Retirás en {storeConfig.address}. Te avisamos cuando esté listo.
            </p>
          )}
        </Step>

        {/* 02 · DATOS */}

        <Step number="02" title="Tus datos" heading="¿A quién esperamos?">
          <div className="space-y-4">
            <TextField
              id="field-name"
              label="Nombre"
              placeholder="Ej. Agustina"
              autoComplete="name"
              value={name}
              onChange={setName}
              error={visibleError("name")}
            />

            <TextField
              id="field-phone"
              label="Teléfono"
              placeholder="Ej. 11 1234 5678"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={setPhone}
              error={visibleError("phone")}
            />

            {orderType === "delivery" && (
              <>
                <TextField
                  id="field-address"
                  label="Dirección"
                  placeholder="Calle y número"
                  autoComplete="street-address"
                  value={address}
                  onChange={setAddress}
                  error={visibleError("address")}
                />

                <TextField
                  id="field-address-reference"
                  label="Piso, depto o referencia (opcional)"
                  placeholder="Ej. 2° B, portón negro"
                  value={addressReference}
                  onChange={setAddressReference}
                  error={null}
                />
              </>
            )}

            <div>
              <label
                htmlFor="field-notes"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
              >
                Notas para el local (opcional)
              </label>

              <textarea
                id="field-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={NOTES_MAX_LENGTH}
                placeholder="Ej. tocar timbre, sin cubiertos…"
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-red-600"
              />
            </div>
          </div>
        </Step>

        {/* 03 · PAGO */}

        <Step number="03" title="Pago" heading="¿Cómo vas a pagar?">
          <div id="field-paymentMethod" className="scroll-mt-24 space-y-2">
            <PaymentOption
              selected={paymentMethod === "cash"}
              hasError={visibleError("paymentMethod") !== null}
              icon="💵"
              title={paymentMethodLabels.cash}
              description={
                orderType === "pickup" ? "Pagás al retirar" : "Pagás al recibir"
              }
              onClick={() => setPaymentMethod("cash")}
            />

            <PaymentOption
              selected={paymentMethod === "transfer"}
              hasError={visibleError("paymentMethod") !== null}
              icon="🏦"
              title={paymentMethodLabels.transfer}
              description="Te pasamos el alias por WhatsApp"
              onClick={() => setPaymentMethod("transfer")}
            />

            <PaymentOption
              selected={paymentMethod === "card"}
              hasError={visibleError("paymentMethod") !== null}
              icon="💳"
              title={paymentMethodLabels.card}
              description={
                orderType === "pickup"
                  ? "Débito o crédito al retirar"
                  : "Débito o crédito al recibir"
              }
              onClick={() => setPaymentMethod("card")}
            />
          </div>

          <FieldError message={visibleError("paymentMethod")} />
        </Step>

        {/* 04 · RESUMEN */}

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#141414] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
            04 · Resumen
          </p>

          <ul className="mt-5 space-y-4">
            {items.map((item) => (
              <li key={item.cartId} className="flex justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-bold">
                    {item.quantity}x {item.name}
                  </p>

                  {itemDetailLines(item).map((detail) => (
                    <p
                      key={`${detail.kind}-${detail.text}`}
                      className="mt-1 break-words text-xs text-neutral-500"
                    >
                      {detail.text}
                    </p>
                  ))}
                </div>

                <span className="shrink-0 font-bold">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Totals
            subtotal={totalPrice}
            orderType={orderType}
            deliveryFee={deliveryFee}
            total={total}
          />
        </section>

        {/* ERROR */}

        {submitError && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
          >
            <p className="text-sm font-black text-red-400">
              No pudimos confirmar tu pedido
            </p>

            <p className="mt-1 text-xs text-red-300/80">{submitError}</p>
          </div>
        )}

        {showErrors && firstError && (
          <p role="alert" className="mt-5 text-center text-xs font-bold text-red-400">
            Revisá los datos marcados en rojo.
          </p>
        )}

        {/* CONFIRMAR */}

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          aria-busy={saving}
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {saving ? "Confirmando…" : "Confirmar pedido"}
          </span>

          <span className="text-lg font-black">{formatPrice(total)}</span>
        </button>

        <p className="mt-3 text-center text-[11px] text-neutral-600">
          Al confirmar, tu pedido queda registrado. Después podés enviarlo por
          WhatsApp.
        </p>
      </div>
    </main>
  );
}

/*
 * =====================================================================
 * CONFIRMACIÓN
 * =====================================================================
 * Muestra SOLO lo que devolvió la base (precios y opciones guardados).
 */

function OrderConfirmation({ order }: { order: ConfirmedOrder }) {
  const { customer } = order;

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-10 pt-10 text-white">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-4xl shadow-2xl shadow-red-950/50">
            ✓
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-red-500">
            Pedido recibido
          </p>

          <h1 className="mt-2 text-4xl font-black">¡Gracias, {customer.name.split(" ")[0]}!</h1>

          <p className="mt-3 text-sm text-neutral-400">Tu número de pedido es</p>

          <div className="mt-3 inline-flex rounded-2xl border border-white/10 bg-[#141414] px-6 py-4">
            <span className="text-3xl font-black tracking-wider">
              {order.orderNumber}
            </span>
          </div>
        </div>

        <a
          href={whatsAppUrl(order)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex w-full flex-col items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          <span className="text-sm font-black uppercase tracking-wide">
            Enviar pedido por WhatsApp
          </span>

          <span className="mt-0.5 text-xs font-bold text-black/60">
            Así lo confirmamos más rápido
          </span>
        </a>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
            Detalle
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Entrega</dt>
              <dd className="font-bold">{orderTypeLabels[customer.orderType]}</dd>
            </div>

            <div>
              <dt className="text-xs text-neutral-500">Pago</dt>
              <dd className="font-bold">
                {paymentMethodLabels[customer.paymentMethod]}
              </dd>
            </div>

            {customer.address && (
              <div className="col-span-2">
                <dt className="text-xs text-neutral-500">Dirección</dt>
                <dd className="break-words font-bold">{customer.address}</dd>
              </div>
            )}
          </dl>

          <ul className="mt-5 space-y-4 border-t border-white/10 pt-5">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-bold">
                    {item.quantity}x {item.productName}
                  </p>

                  {item.options.map((option, optionIndex) => (
                    <p
                      key={optionIndex}
                      className="mt-1 break-words text-xs text-neutral-500"
                    >
                      {savedOptionText(option)}
                    </p>
                  ))}
                </div>

                <span className="shrink-0 font-black">
                  {formatPrice(item.totalPrice)}
                </span>
              </li>
            ))}
          </ul>

          <Totals
            subtotal={order.subtotal}
            orderType={customer.orderType}
            deliveryFee={order.deliveryFee}
            total={order.total}
          />
        </section>

        {customer.paymentMethod === "transfer" && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-[#111111] p-4 text-xs leading-5 text-neutral-400">
            Pagás por transferencia: al enviarnos el pedido por WhatsApp te
            pasamos el alias.
          </p>
        )}

        <Link
          href="/"
          className="mt-4 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#141414] px-5 py-4 text-sm font-bold text-neutral-300 transition hover:border-white/20 hover:text-white"
        >
          Volver al menú
        </Link>
      </div>
    </main>
  );
}

/*
 * =====================================================================
 * COMPONENTES
 * =====================================================================
 */

function Step({
  number,
  title,
  heading,
  children,
}: {
  number: string;
  title: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
        {number} · {title}
      </p>

      <h2 className="mt-1 text-2xl font-black">{heading}</h2>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function Totals({
  subtotal,
  orderType,
  deliveryFee,
  total,
}: {
  subtotal: number;
  orderType: OrderType | null;
  deliveryFee: number;
  total: number;
}) {
  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex justify-between text-sm text-neutral-400">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      <div className="mt-2 flex justify-between text-sm text-neutral-400">
        <span>{orderType === "pickup" ? "Retiro" : "Envío"}</span>
        <span>
          {orderType === null
            ? "Elegí la entrega"
            : deliveryFee === 0
              ? "Gratis"
              : formatPrice(deliveryFee)}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <span className="font-bold">Total</span>
        <span className="text-2xl font-black">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="mt-2 text-xs font-bold text-red-400">
      {message}
    </p>
  );
}

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  type?: "text" | "tel";
  inputMode?: "text" | "tel";
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full scroll-mt-24 rounded-2xl border bg-[#141414] px-4 py-3 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 sm:text-sm ${
          error ? "border-red-500/60" : "border-white/10"
        }`}
      />

      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs font-bold text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function ChoiceCard({
  selected,
  hasError,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  hasError: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
        selected
          ? "border-red-600 bg-red-600/10"
          : hasError
            ? "border-red-500/50 bg-[#141414]"
            : "border-white/10 bg-[#141414] hover:border-white/20"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </button>
  );
}

function PaymentOption({
  selected,
  hasError,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  hasError: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        selected
          ? "border-red-600 bg-red-600/10"
          : hasError
            ? "border-red-500/50 bg-[#141414]"
            : "border-white/10 bg-[#141414] hover:border-white/20"
      }`}
    >
      <span className="text-2xl">{icon}</span>

      <div className="flex-1">
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>

      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          selected ? "border-red-500 bg-red-500" : "border-white/20"
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}
