"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import DeliveryLocationPicker from "../components/DeliveryLocationPicker";
import {
  type OrderType,
  type PaymentMethod,
  paymentMethodLabels,
  storeConfig,
} from "../data/store";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { type LatLng, distanceKm } from "@/lib/geo";
import {
  type CustomerData,
  GENERIC_ORDER_ERROR,
  buildOrderPayload,
  itemDetailLines,
  orderErrorMessage,
  parseCreatedOrderId,
} from "@/lib/order";
import { saveRecentOrder } from "@/lib/recent-order";
import { storeStatus } from "@/lib/schedule";
import {
  type StoreSettings,
  estimateDeliveryFee,
  useNow,
  useStoreSettings,
} from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

const NOTES_MAX_LENGTH = 500;

type FieldErrors = {
  orderType: string | null;
  name: string | null;
  phone: string | null;
  location: string | null;
  address: string | null;
  paymentMethod: string | null;
};

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "orderType",
  "location",
  "address",
  "name",
  "phone",
  "paymentMethod",
];

export default function CheckoutPage() {
  const settingsState = useStoreSettings();
  const { items } = useCart();
  const [redirecting, setRedirecting] = useState(false);

  if (redirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-3xl">
            ✓
          </div>
          <p className="mt-4 text-sm font-bold text-neutral-400">Pedido confirmado…</p>
        </div>
      </main>
    );
  }

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

  if (settingsState.status !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        {settingsState.status === "error" ? (
          <div className="text-center">
            <p className="font-black">No pudimos cargar los datos del local</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-black"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
        )}
      </main>
    );
  }

  return (
    <CheckoutForm
      settings={settingsState.settings}
      onConfirmed={() => setRedirecting(true)}
    />
  );
}

function CheckoutForm({
  settings,
  onConfirmed,
}: {
  settings: StoreSettings;
  onConfirmed: () => void;
}) {
  const router = useRouter();
  const now = useNow();
  const { items, totalPrice, clearCart } = useCart();

  const deliveryAvailable = settings.deliveryEnabled;

  const [orderType, setOrderType] = useState<OrderType | null>(
    deliveryAvailable ? null : "pickup"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  /* Última dirección sugerida por el mapa: si el usuario no la tocó, se reemplaza. */
  const [autoAddress, setAutoAddress] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [notes, setNotes] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const status = storeStatus(
    settings.schedule,
    settings.timezone,
    settings.acceptingOrders,
    now
  );

  const deliveryFee = estimateDeliveryFee(settings, orderType, totalPrice);
  const total = totalPrice + deliveryFee;
  const phoneDigits = phone.replace(/\D/g, "").length;

  const storeLocation = settings.location;
  const outOfRange =
    orderType === "delivery" &&
    storeLocation !== null &&
    location !== null &&
    distanceKm(storeLocation, location) > settings.deliveryRadiusKm;

  const errors: FieldErrors = {
    orderType: orderType ? null : "Elegí delivery o retiro.",
    location:
      orderType !== "delivery" || storeLocation === null
        ? null
        : !location
          ? "Marcá tu ubicación en el mapa."
          : outOfRange
            ? "Tu ubicación está fuera de la zona de delivery."
            : null,
    address:
      orderType !== "delivery" || address.trim().length >= 5
        ? null
        : "Ingresá calle y número.",
    name: name.trim().length >= 2 ? null : "Ingresá tu nombre.",
    phone:
      phoneDigits >= 8 && phoneDigits <= 15
        ? null
        : "Ingresá un teléfono válido, con código de área.",
    paymentMethod: paymentMethod ? null : "Elegí cómo vas a pagar.",
  };

  const firstError = FIELD_ORDER.find((field) => errors[field] !== null);
  const visibleError = (field: keyof FieldErrors) =>
    showErrors ? errors[field] : null;

  const handleLocationChange = (point: LatLng, label: string | null) => {
    setLocation(point);

    if (label && (address.trim() === "" || address === autoAddress)) {
      setAddress(label);
      setAutoAddress(label);
    }
  };

  const handleSubmit = async () => {
    if (saving || !status.open) {
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
      location: orderType === "delivery" ? location : null,
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
        setSaving(false);
        return;
      }

      const orderId = parseCreatedOrderId(data);

      if (!orderId) {
        console.error("Respuesta inesperada al crear el pedido:", data);
        setSubmitError(GENERIC_ORDER_ERROR);
        setSaving(false);
        return;
      }

      saveRecentOrder(orderId);
      onConfirmed();
      clearCart();
      router.replace(`/pedido/${orderId}`);
    } catch (error) {
      console.error("Error inesperado creando el pedido:", error);
      setSubmitError(GENERIC_ORDER_ERROR);
      setSaving(false);
    }
  };

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
              {settings.name}
            </p>

            <h1 className="text-lg font-black">Finalizar pedido</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-7">
        {!status.open && (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4"
          >
            <p className="text-sm font-black text-yellow-300">
              {status.reason === "paused" ? "Pedidos pausados" : "Estamos cerrados"}
            </p>
            <p className="mt-1 text-xs text-yellow-200/70">{status.label}</p>
          </div>
        )}

        {/* 01 · ENTREGA */}

        <Step number="01" title="Entrega" heading="¿Cómo querés recibirlo?">
          <div id="field-orderType" className="grid scroll-mt-24 grid-cols-2 gap-3">
            <ChoiceCard
              selected={orderType === "delivery"}
              hasError={visibleError("orderType") !== null}
              disabled={!deliveryAvailable}
              icon="🛵"
              title="Delivery"
              description={
                deliveryAvailable
                  ? `Hasta ${settings.deliveryRadiusKm} km`
                  : "No disponible ahora"
              }
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
            <div className="mt-5 space-y-4">
              <p className="text-xs leading-5 text-neutral-400">
                Envío {settings.deliveryFee === 0 ? "gratis" : formatPrice(settings.deliveryFee)}
                {settings.deliveryFreeFrom !== null &&
                  settings.deliveryFee > 0 &&
                  `, gratis desde ${formatPrice(settings.deliveryFreeFrom)}`}
                .
              </p>

              {storeLocation && (
                <>
                  <DeliveryLocationPicker
                    store={storeLocation}
                    radiusKm={settings.deliveryRadiusKm}
                    point={location}
                    onChange={handleLocationChange}
                    onSwitchToPickup={() => setOrderType("pickup")}
                    hasError={visibleError("location") !== null}
                  />
                  <FieldError message={visibleError("location")} />
                </>
              )}

              <TextField
                id="field-address"
                label="Dirección de entrega"
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
            </div>
          )}

          {orderType === "pickup" && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-[#111111] p-4 text-xs leading-5 text-neutral-400">
              Retirás en {settings.address || "el local"}. Te avisamos cuando esté listo.
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
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 sm:text-sm"
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
              description={orderType === "pickup" ? "Pagás al retirar" : "Pagás al recibir"}
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

        <button
          type="button"
          disabled={saving || !status.open}
          onClick={handleSubmit}
          aria-busy={saving}
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
        >
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {!status.open
              ? status.reason === "paused"
                ? "Pedidos pausados"
                : "Cerrado ahora"
              : saving
                ? "Confirmando…"
                : "Confirmar pedido"}
          </span>

          <span className="text-lg font-black">{formatPrice(total)}</span>
        </button>

        <p className="mt-3 text-center text-[11px] text-neutral-600">
          Al confirmar, tu pedido queda registrado en {storeConfig.name} y podés
          seguirlo en vivo.
        </p>
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
  disabled = false,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  hasError: boolean;
  disabled?: boolean;
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
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
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
