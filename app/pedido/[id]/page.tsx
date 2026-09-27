"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { orderTypeLabels, paymentMethodLabels } from "../../data/store";

import { formatPrice } from "@/lib/format";
import {
  type TrackedOrder,
  buildWhatsAppMessage,
  parseTrackedOrder,
  savedOptionText,
  whatsAppUrl,
} from "@/lib/order";
import {
  TRACKING_STEPS,
  customerStatusText,
  isActiveStatus,
  trackingStepLabel,
} from "@/lib/order-status";
import { useStoreSettings } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

const POLL_MS = 15000;

type LoadResult = TrackedOrder | "not-found" | "error";

async function fetchTracking(orderId: string): Promise<LoadResult> {
  const { data, error } = await supabase.rpc("get_order_tracking", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("Error consultando el pedido:", error);
    /* Un id con formato inválido también cae acá. */
    return error.code === "22P02" ? "not-found" : "error";
  }

  if (data === null) {
    return "not-found";
  }

  return parseTrackedOrder(data) ?? "error";
}

export default function OrderTrackingPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const settingsState = useStoreSettings();
  const [loaded, setLoaded] = useState<{ orderId: string; result: LoadResult } | null>(
    null
  );

  /* Consulta inicial + cada 15 s mientras el pedido esté en curso. */
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      const result = await fetchTracking(orderId);
      if (cancelled) return;

      setLoaded((previous) =>
        /* Si falla una consulta periódica, se mantiene el último dato bueno. */
        result === "error" && previous?.orderId === orderId && typeof previous.result === "object"
          ? previous
          : { orderId, result }
      );

      const keepPolling =
        result === "error" || (typeof result === "object" && isActiveStatus(result.status));

      if (keepPolling) {
        timer = window.setTimeout(poll, POLL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderId]);

  if (!loaded || loaded.orderId !== orderId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
      </main>
    );
  }

  const { result } = loaded;

  if (typeof result !== "object") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="max-w-sm text-center">
          <p className="text-5xl">{result === "error" ? "😕" : "🔎"}</p>
          <h1 className="mt-5 text-2xl font-black">
            {result === "error" ? "No pudimos cargar tu pedido" : "No encontramos este pedido"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {result === "error"
              ? "Revisá tu conexión y volvé a intentar."
              : "El link puede estar vencido (los pedidos se pueden seguir durante 7 días)."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-red-600 px-6 py-3 text-sm font-black"
          >
            Volver al menú
          </Link>
        </div>
      </main>
    );
  }

  const order = result;
  const settings = settingsState.status === "ready" ? settingsState.settings : null;
  const statusText = customerStatusText(order.status, order.orderType);
  const cancelled = order.status === "cancelled";
  const currentStep = TRACKING_STEPS.indexOf(order.status);
  const whatsappHref =
    settings?.whatsapp &&
    whatsAppUrl(
      settings.whatsapp,
      buildWhatsAppMessage(order, `${window.location.origin}/pedido/${order.id}`)
    );

  return (
    <main className="min-h-screen bg-[#090909] px-5 pb-12 pt-8 text-white">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-neutral-500 hover:text-white">
            ← Menú
          </Link>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            {settings?.name ?? "Burger House"}
          </p>
        </div>

        {/* ESTADO */}
        <section
          aria-live="polite"
          className={`mt-6 rounded-3xl border p-6 text-center ${
            cancelled ? "border-white/10 bg-[#111111]" : "border-red-600/40 bg-gradient-to-b from-red-600/15 to-transparent"
          }`}
        >
          <p className="text-xs font-bold text-neutral-400">Pedido</p>
          <p className="mt-1 text-4xl font-black tracking-wider">{order.orderNumber}</p>

          <div className="mt-6 text-5xl">{statusText.icon}</div>
          <h1 className="mt-3 text-2xl font-black">{statusText.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">{statusText.detail}</p>

          {!cancelled && (
            <ol className="mt-7 grid grid-cols-5 gap-1">
              {TRACKING_STEPS.map((step, index) => {
                const done = index <= currentStep;

                return (
                  <li key={step} className="flex flex-col items-center gap-2">
                    <span
                      className={`h-1.5 w-full rounded-full ${
                        done ? "bg-red-500" : "bg-white/10"
                      } ${index === currentStep && isActiveStatus(order.status) ? "animate-pulse" : ""}`}
                    />
                    <span
                      className={`text-[10px] font-bold ${done ? "text-white" : "text-neutral-600"}`}
                    >
                      {trackingStepLabel(step, order.orderType)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {isActiveStatus(order.status) && (
            <p className="mt-5 text-[11px] text-neutral-500">
              Esta página se actualiza sola.
            </p>
          )}
        </section>

        {/* WHATSAPP */}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            <span className="text-sm font-black uppercase tracking-wide">
              {order.status === "pending"
                ? "Enviar pedido por WhatsApp"
                : "Escribirnos por WhatsApp"}
            </span>
            {order.status === "pending" && (
              <span className="mt-0.5 text-xs font-bold text-black/60">
                Así lo confirmamos más rápido
              </span>
            )}
          </a>
        )}

        {/* DETALLE */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-[#141414] p-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Entrega</dt>
              <dd className="font-bold">{orderTypeLabels[order.orderType]}</dd>
            </div>

            <div>
              <dt className="text-xs text-neutral-500">Pago</dt>
              <dd className="font-bold">
                {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : "—"}
              </dd>
            </div>

            {order.customerAddress && (
              <div className="col-span-2">
                <dt className="text-xs text-neutral-500">Dirección</dt>
                <dd className="break-words font-bold">{order.customerAddress}</dd>
              </div>
            )}

            {order.orderType === "pickup" && settings?.address && (
              <div className="col-span-2">
                <dt className="text-xs text-neutral-500">Retirás en</dt>
                <dd className="font-bold">{settings.address}</dd>
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
                    <p key={optionIndex} className="mt-1 break-words text-xs text-neutral-500">
                      {savedOptionText(option)}
                    </p>
                  ))}
                </div>

                <span className="shrink-0 font-black">{formatPrice(item.totalPrice)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>

            {order.orderType === "delivery" && (
              <div className="flex justify-between text-neutral-400">
                <span>Envío</span>
                <span>{order.deliveryFee === 0 ? "Gratis" : formatPrice(order.deliveryFee)}</span>
              </div>
            )}

            <div className="flex items-end justify-between pt-2">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-black">{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        {order.paymentMethod === "transfer" && isActiveStatus(order.status) && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-[#111111] p-4 text-xs leading-5 text-neutral-400">
            Pagás por transferencia: escribinos por WhatsApp y te pasamos el alias.
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
