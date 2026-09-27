"use client";

import { useEffect, useState } from "react";

import {
  type OrderType,
  orderTypeLabels,
  paymentMethodLabels,
  storeConfig,
} from "../data/store";

import AcceptingOrdersToggle from "./components/AcceptingOrdersToggle";

import {
  ACTIVE_STATUSES,
  type AdminOrder,
  type OrderStatus,
  customerWhatsAppUrl,
  fetchAdminOrders,
  nextStep,
  statusClasses,
  statusLabel,
  updateOrderStatus,
} from "@/lib/admin/orders";
import { formatPrice } from "@/lib/format";
import { formatKm } from "@/lib/geo";
import { supabase } from "@/lib/supabase";

type Tab = "active" | "finished";

/*
 * Aviso sonoro corto para pedidos nuevos (Web Audio, sin archivos).
 */
function playNewOrderSound() {
  try {
    const context = new AudioContext();

    [0, 0.18].forEach((delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.15);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.16);
    });
  } catch (error) {
    console.warn("No se pudo reproducir el aviso sonoro:", error);
  }
}

function isSameLocalDay(iso: string, now: number) {
  return new Date(iso).toDateString() === new Date(now).toDateString();
}

function minutesAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h ${minutes % 60} min`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const [soundOn, setSoundOn] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [live, setLive] = useState(false);

  /* Carga inicial + Realtime: cualquier cambio en orders recarga la lista. */
  useEffect(() => {
    let cancelled = false;

    const refresh = () =>
      fetchAdminOrders().then((result) => {
        if (cancelled) return;
        setLoadError(result === null);
        if (result) setOrders(result);
      });

    void refresh();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${storeConfig.restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            window.dispatchEvent(new Event("burger-house:new-order"));
          }
          void refresh();
        }
      )
      .subscribe((status) => {
        if (!cancelled) setLive(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  /* Sonido: escucha el evento del canal según la preferencia actual. */
  useEffect(() => {
    if (!soundOn) return;

    const onNewOrder = () => playNewOrderSound();
    window.addEventListener("burger-house:new-order", onNewOrder);

    return () => window.removeEventListener("burger-house:new-order", onNewOrder);
  }, [soundOn]);

  /* Reloj para los "hace X min". */
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const pendingCount =
    orders?.filter((order) => order.status === "pending").length ?? 0;

  /* Título de la pestaña con pedidos nuevos: sincroniza con el DOM. */
  useEffect(() => {
    document.title =
      pendingCount > 0
        ? `(${pendingCount}) Pedidos · ${storeConfig.name}`
        : `Pedidos · ${storeConfig.name}`;
  }, [pendingCount]);

  const changeStatus = async (order: AdminOrder, status: OrderStatus) => {
    setActionError(null);

    const previous = orders;
    setOrders(
      (current) =>
        current?.map((item) =>
          item.id === order.id ? { ...item, status } : item
        ) ?? null
    );

    const ok = await updateOrderStatus(order.id, status);

    if (!ok) {
      setOrders(previous);
      setActionError(
        `No pudimos actualizar el pedido ${order.orderNumber}. Probá de nuevo.`
      );
    }
  };

  if (orders === null) {
    return (
      <div className="p-5 sm:p-8">
        {loadError ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="font-black text-red-300">No pudimos cargar los pedidos</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-black"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-lg bg-white/10" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-24 rounded-3xl bg-[#141414]" />
              ))}
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-48 rounded-3xl bg-[#141414]" />
            ))}
          </div>
        )}
      </div>
    );
  }

  const todayOrders = orders.filter(
    (order) => isSameLocalDay(order.createdAt, now) && order.status !== "cancelled"
  );
  const todaySales = todayOrders.reduce((total, order) => total + order.total, 0);
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const finishedOrders = orders.filter(
    (order) => !ACTIVE_STATUSES.includes(order.status)
  );

  /* Activos: los más viejos primero (se atienden en orden de llegada). */
  const visibleOrders =
    tab === "active" ? [...activeOrders].reverse() : finishedOrders;

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            Panel
          </p>
          <h1 className="mt-1 text-3xl font-black">Pedidos</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AcceptingOrdersToggle />
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ${
              live ? "bg-green-500/10 text-green-400" : "bg-white/5 text-neutral-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                live ? "animate-pulse bg-green-400" : "bg-neutral-600"
              }`}
            />
            {live ? "En vivo" : "Conectando…"}
          </span>

          <button
            type="button"
            onClick={() => {
              setSoundOn((on) => !on);
              if (!soundOn) playNewOrderSound();
            }}
            aria-pressed={soundOn}
            className="rounded-full border border-white/10 bg-[#141414] px-3 py-1.5 text-[11px] font-black text-neutral-300"
          >
            {soundOn ? "🔔 Sonido" : "🔕 Silencio"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Nuevos" value={String(pendingCount)} highlight={pendingCount > 0} />
        <Stat title="En curso" value={String(activeOrders.length)} />
        <Stat title="Pedidos de hoy" value={String(todayOrders.length)} />
        <Stat title="Ventas de hoy" value={formatPrice(todaySales)} />
      </div>

      <div className="mt-8 flex gap-2" role="tablist">
        <TabButton
          active={tab === "active"}
          onClick={() => setTab("active")}
          label={`Activos (${activeOrders.length})`}
        />
        <TabButton
          active={tab === "finished"}
          onClick={() => setTab("finished")}
          label="Finalizados"
        />
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {actionError}
        </p>
      )}

      {visibleOrders.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-white/10 bg-[#111111] px-6 py-16 text-center">
          <p className="text-4xl">{tab === "active" ? "🍔" : "📦"}</p>
          <p className="mt-3 font-black">
            {tab === "active" ? "No hay pedidos en curso" : "Todavía no hay pedidos finalizados"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {tab === "active"
              ? "Los pedidos nuevos aparecen acá automáticamente."
              : "Se muestran los pedidos de los últimos 3 días."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              now={now}
              onChangeStatus={(status) => void changeStatus(order, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 ${
        highlight ? "border-red-600 bg-red-600/10" : "border-white/10 bg-[#111111]"
      }`}
    >
      <p className="text-xs font-bold text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active ? "bg-white text-black" : "bg-[#141414] text-neutral-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function optionText(name: string, value: string) {
  if (name === "Sin") return `Sin ${value}`;
  if (name === "Observaciones") return `“${value}”`;
  return `${name}: ${value}`;
}

function OrderCard({
  order,
  now,
  onChangeStatus,
}: {
  order: AdminOrder;
  now: number;
  onChangeStatus: (status: OrderStatus) => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const step = nextStep(order.status, order.orderType);
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const time = new Date(order.createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article
      className={`flex flex-col rounded-3xl border bg-[#111111] ${
        order.status === "pending" ? "border-red-600 shadow-lg shadow-red-950/30" : "border-white/10"
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{order.orderNumber}</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClasses[order.status]}`}
            >
              {statusLabel(order.status, order.orderType)}
            </span>
          </div>

          <p className="mt-1 text-xs text-neutral-500">
            {time} · {minutesAgo(order.createdAt, now)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-black">{formatPrice(order.total)}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : "—"}
          </p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <CustomerBlock order={order} type={order.orderType} />

        <ul className="space-y-3 rounded-2xl bg-[#0b0b0b] p-4">
          {order.items.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <p className="font-black">
                  <span className="text-red-400">{item.quantity}x</span> {item.productName}
                </p>
                <span className="shrink-0 text-neutral-400">
                  {formatPrice(item.totalPrice)}
                </span>
              </div>

              {item.options.map((option) => (
                <p
                  key={option.id}
                  className={`ml-6 mt-0.5 text-xs ${
                    option.name === "Sin"
                      ? "font-black text-red-300"
                      : option.name === "Observaciones"
                        ? "italic text-yellow-200/80"
                        : "text-neutral-400"
                  }`}
                >
                  {optionText(option.name, option.value)}
                </p>
              ))}
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200">
            <span className="font-black">Nota del cliente:</span> {order.notes}
          </p>
        )}

        <div className="flex justify-between text-xs text-neutral-500">
          <span>
            Subtotal {formatPrice(order.subtotal)}
            {order.orderType === "delivery" &&
              ` · Envío ${order.deliveryFee === 0 ? "gratis" : formatPrice(order.deliveryFee)}`}
          </span>
        </div>
      </div>

      {isActive && (
        <footer className="mt-auto flex gap-2 border-t border-white/10 p-4">
          {confirmingCancel ? (
            <>
              <button
                type="button"
                onClick={() => onChangeStatus("cancelled")}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black"
              >
                Sí, cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-neutral-300"
              >
                Volver
              </button>
            </>
          ) : (
            <>
              {step && (
                <button
                  type="button"
                  onClick={() => onChangeStatus(step.status)}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black transition hover:bg-red-500 active:scale-[0.98]"
                >
                  {step.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-neutral-400 hover:border-red-500/40 hover:text-red-300"
              >
                Cancelar
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}

function CustomerBlock({ order, type }: { order: AdminOrder; type: OrderType }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 text-sm">
        <p className="font-black">{order.customerName}</p>
        <p className="mt-0.5 text-neutral-400">
          {type === "delivery" ? "🛵" : "🏪"} {orderTypeLabels[type]}
        </p>
        {order.customerAddress && (
          <p className="mt-0.5 break-words text-neutral-300">{order.customerAddress}</p>
        )}
        {order.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${order.location.lat},${order.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-neutral-300 hover:bg-white/10"
          >
            📍 Ver en el mapa
            {order.distanceKm !== null && ` · ${formatKm(order.distanceKm)}`}
          </a>
        )}
        {order.customerPhone && (
          <a href={`tel:${order.customerPhone}`} className="mt-0.5 block text-neutral-500 hover:text-white">
            {order.customerPhone}
          </a>
        )}
      </div>

      {order.customerPhone && (
        <a
          href={customerWhatsAppUrl(order)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-black text-black"
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}
