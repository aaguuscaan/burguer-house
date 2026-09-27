"use client";

import { useEffect, useState } from "react";

import { type ScheduleRange, parseSchedule } from "./schedule";
import { supabase } from "./supabase";

import { storeConfig } from "@/app/data/store";

/*
 * Configuración del local (tabla restaurants). Se carga una vez por
 * sesión del navegador y se comparte entre pantallas.
 */

export type StoreSettings = {
  name: string;
  address: string;
  phone: string;
  instagram: string;
  whatsapp: string;
  location: { lat: number; lng: number } | null;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryFee: number;
  deliveryFreeFrom: number | null;
  schedule: ScheduleRange[];
  acceptingOrders: boolean;
  timezone: string;
};

export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "name, address, phone, instagram, whatsapp_number, latitude, longitude, delivery_enabled, delivery_radius_km, delivery_fee, delivery_free_from, schedule, accepting_orders, timezone"
    )
    .eq("id", storeConfig.restaurantId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error cargando la configuración del local:", error);
    return null;
  }

  return {
    name: data.name,
    address: data.address ?? "",
    phone: data.phone ?? "",
    instagram: data.instagram ?? "",
    whatsapp: (data.whatsapp_number ?? "").replace(/\D/g, ""),
    location:
      data.latitude !== null && data.longitude !== null
        ? { lat: data.latitude, lng: data.longitude }
        : null,
    deliveryEnabled: data.delivery_enabled ?? true,
    deliveryRadiusKm: Number(data.delivery_radius_km ?? 5),
    deliveryFee: Number(data.delivery_fee),
    deliveryFreeFrom:
      data.delivery_free_from === null ? null : Number(data.delivery_free_from),
    schedule: parseSchedule(data.schedule),
    acceptingOrders: data.accepting_orders,
    timezone: data.timezone,
  };
}

let cached: Promise<StoreSettings | null> | null = null;

export function loadStoreSettings({ refresh = false } = {}) {
  if (!cached || refresh) {
    cached = fetchStoreSettings().then((settings) => {
      /* Si falló, el próximo intento vuelve a consultar. */
      if (!settings) cached = null;
      return settings;
    });
  }

  return cached;
}

export type StoreSettingsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; settings: StoreSettings };

export function useStoreSettings(): StoreSettingsState {
  const [state, setState] = useState<StoreSettingsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadStoreSettings().then((settings) => {
      if (!cancelled) {
        setState(settings ? { status: "ready", settings } : { status: "error" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* Reloj que se actualiza cada minuto (para "abierto / cerrado"). */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}

export function estimateDeliveryFee(
  settings: StoreSettings,
  orderType: "delivery" | "pickup" | null,
  subtotal: number
) {
  if (orderType !== "delivery") {
    return 0;
  }

  return settings.deliveryFreeFrom !== null && subtotal >= settings.deliveryFreeFrom
    ? 0
    : settings.deliveryFee;
}
