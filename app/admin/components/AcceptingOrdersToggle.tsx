"use client";

import { useState } from "react";

import { setAcceptingOrders } from "@/lib/admin/settings";
import { useStoreSettings } from "@/lib/store-settings";

/* Botón rápido para pausar / reanudar la recepción de pedidos. */
export default function AcceptingOrdersToggle() {
  const settingsState = useStoreSettings();
  const [override, setOverride] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  if (settingsState.status !== "ready") {
    return null;
  }

  const accepting = override ?? settingsState.settings.acceptingOrders;

  const toggle = async () => {
    const next = !accepting;

    setSaving(true);
    setOverride(next);

    if (!(await setAcceptingOrders(next))) {
      setOverride(!next);
    }

    setSaving(false);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={accepting}
      disabled={saving}
      onClick={() => void toggle()}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black transition disabled:opacity-60 ${
        accepting
          ? "bg-white/5 text-neutral-300 hover:bg-white/10"
          : "bg-yellow-500 text-black"
      }`}
    >
      {accepting ? "⏸ Pausar pedidos" : "▶ Pedidos pausados · Reanudar"}
    </button>
  );
}
