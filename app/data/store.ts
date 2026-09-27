/*
 * Datos fijos de la app. Todo lo que el local puede cambiar (WhatsApp,
 * horarios, delivery, ubicación…) vive en la tabla restaurants y se edita
 * desde /admin/settings. Ver lib/store-settings.ts.
 */

export type OrderType = "delivery" | "pickup";

export type PaymentMethod = "cash" | "transfer" | "card";

export const storeConfig = {
  /* ID del restaurante en Supabase (tabla restaurants). */
  restaurantId: "926cd9b7-7fa2-4664-8cd8-c65e80ea1956",

  name: "Burger House",

  tagline: "Comida real. Sin vueltas.",
};

/*
 * Valores internos (los que se guardan en orders) → texto para el usuario.
 */
export const orderTypeLabels: Record<OrderType, string> = {
  delivery: "Delivery",
  pickup: "Retiro en el local",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};
