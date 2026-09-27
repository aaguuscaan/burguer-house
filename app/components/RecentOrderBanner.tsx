"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { type TrackedOrder, parseTrackedOrder } from "@/lib/order";
import { customerStatusText, isActiveStatus } from "@/lib/order-status";
import { clearRecentOrder, readRecentOrder } from "@/lib/recent-order";
import { supabase } from "@/lib/supabase";

/* "Tu pedido BH-1234 · En preparación" si hay un pedido en curso. */
export default function RecentOrderBanner() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    const orderId = readRecentOrder();

    if (!orderId) return;

    supabase.rpc("get_order_tracking", { p_order_id: orderId }).then(({ data, error }) => {
      if (cancelled || error) return;

      const tracked = data === null ? null : parseTrackedOrder(data);

      if (!tracked || !isActiveStatus(tracked.status)) {
        clearRecentOrder();
        return;
      }

      setOrder(tracked);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!order) {
    return null;
  }

  return (
    <Link
      href={`/pedido/${order.id}`}
      className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-red-600/40 bg-red-600/10 px-5 py-4 transition hover:bg-red-600/15"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        <div>
          <p className="text-sm font-black">Tu pedido {order.orderNumber}</p>
          <p className="text-xs text-neutral-400">{customerStatusText(order.status, order.orderType).title}</p>
        </div>
      </div>
      <span className="text-sm font-black text-red-400">Ver →</span>
    </Link>
  );
}
