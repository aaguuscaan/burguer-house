export type OrderType = "delivery" | "pickup";

export type PaymentMethod = "cash" | "transfer" | "card";

export const storeConfig = {
  /*
   * ID del restaurante en Supabase (tabla restaurants).
   */
  restaurantId: "926cd9b7-7fa2-4664-8cd8-c65e80ea1956",

  name: "Burger House",

  address: "Parque Sakura, Pavón, Buenos Aires, Argentina",

  phone: "11 1234-5678",

  whatsapp: "5491121833530",

  instagram: "@burgerhouse",

  schedule: "Todos los días · 19:00–01:00",

  /*
   * Deben coincidir con restaurants.delivery_fee y
   * restaurants.delivery_free_from (migración 001).
   * El total definitivo siempre lo calcula la base.
   */
  delivery: {
    enabled: true,
    radiusKm: 5,
    baseCost: 1500,
    freeFrom: 25000,
  },
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
