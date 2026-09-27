import { storeConfig } from "@/app/data/store";
import type { ScheduleRange } from "@/lib/schedule";
import { loadStoreSettings } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";

export type SettingsUpdate = {
  acceptingOrders: boolean;
  schedule: ScheduleRange[];
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryFee: number;
  deliveryFreeFrom: number | null;
  location: { lat: number; lng: number } | null;
  whatsapp: string;
  phone: string;
  address: string;
  instagram: string;
};

export async function saveSettings(values: SettingsUpdate) {
  const { error } = await supabase
    .from("restaurants")
    .update({
      accepting_orders: values.acceptingOrders,
      schedule: values.schedule,
      delivery_enabled: values.deliveryEnabled,
      delivery_radius_km: values.deliveryRadiusKm,
      delivery_fee: values.deliveryFee,
      delivery_free_from: values.deliveryFreeFrom,
      latitude: values.location?.lat ?? null,
      longitude: values.location?.lng ?? null,
      whatsapp_number: values.whatsapp || null,
      phone: values.phone || null,
      address: values.address || null,
      instagram: values.instagram || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeConfig.restaurantId);

  if (error) {
    console.error("Error guardando configuración:", error);
    return false;
  }

  void loadStoreSettings({ refresh: true });
  return true;
}

export async function setAcceptingOrders(accepting: boolean) {
  const { error } = await supabase
    .from("restaurants")
    .update({ accepting_orders: accepting, updated_at: new Date().toISOString() })
    .eq("id", storeConfig.restaurantId);

  if (error) {
    console.error("Error cambiando la recepción de pedidos:", error);
    return false;
  }

  void loadStoreSettings({ refresh: true });
  return true;
}
