import type { CartItem } from "./cart";
import type { Json } from "./database.types";
import { formatPrice } from "./format";
import type { LatLng } from "./geo";

import {
  type OrderType,
  type PaymentMethod,
  orderTypeLabels,
  paymentMethodLabels,
  storeConfig,
} from "@/app/data/store";

/*
 * =====================================================================
 * Detalle legible de una línea del carrito
 * =====================================================================
 */

export type DetailLine = {
  text: string;
  price: number;
  kind: "option" | "extra" | "removed" | "notes";
};

export function itemDetailLines(
  item: Pick<CartItem, "options" | "extras" | "removedIngredients" | "notes">
): DetailLine[] {
  return [
    ...item.options.map((option) => ({
      text: `${option.groupName}: ${option.itemName}`,
      price: option.price,
      kind: "option" as const,
    })),
    ...item.extras.map((extra) => ({
      text: `+ ${extra.itemName}`,
      price: extra.price,
      kind: "extra" as const,
    })),
    ...item.removedIngredients.map((ingredient) => ({
      text: `Sin ${ingredient.name}`,
      price: 0,
      kind: "removed" as const,
    })),
    ...(item.notes
      ? [{ text: `Obs.: ${item.notes}`, price: 0, kind: "notes" as const }]
      : []),
  ];
}

/*
 * =====================================================================
 * Payload para create_burger_house_order (sin precios: los calcula la base)
 * =====================================================================
 */

export type CustomerData = {
  name: string;
  phone: string;
  address: string | null;
  location: LatLng | null;
  notes: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
};

export function buildOrderPayload(
  customer: CustomerData,
  items: CartItem[]
): { p_order: Json; p_items: Json } {
  return {
    p_order: {
      restaurant_id: storeConfig.restaurantId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      order_type: customer.orderType,
      payment_method: customer.paymentMethod,
      notes: customer.notes,
      delivery_lat: customer.location?.lat ?? null,
      delivery_lng: customer.location?.lng ?? null,
    },

    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      option_item_ids: [...item.options, ...item.extras].map(
        (selection) => selection.itemId
      ),
      removed_ingredient_ids: item.removedIngredients.map(
        (ingredient) => ingredient.id
      ),
      notes: item.notes,
    })),
  };
}

type JsonObject = { [key: string]: Json | undefined };

function isJsonObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* create_burger_house_order devuelve { id, order_number, … }. */
export function parseCreatedOrderId(data: Json): string | null {
  return isJsonObject(data) && typeof data.id === "string" ? data.id : null;
}

/*
 * =====================================================================
 * Pedido tal como está guardado (get_order_tracking)
 * =====================================================================
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash" || value === "transfer" || value === "card";
}

export type SavedOrderOption = {
  name: string;
  value: string;
  price: number;
};

export type SavedOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options: SavedOrderOption[];
};

export type TrackedOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: SavedOrderItem[];
};

function parseOption(value: Json): SavedOrderOption | null {
  if (!isJsonObject(value)) return null;

  const { option_name, option_value, price } = value;

  return typeof option_name === "string" && typeof option_value === "string"
    ? { name: option_name, value: option_value, price: Number(price ?? 0) }
    : null;
}

function parseItem(value: Json): SavedOrderItem | null {
  if (!isJsonObject(value)) return null;

  const { product_name, quantity, unit_price, total_price, options } = value;

  if (typeof product_name !== "string" || typeof quantity !== "number") {
    return null;
  }

  return {
    productName: product_name,
    quantity,
    unitPrice: Number(unit_price),
    totalPrice: Number(total_price),
    options: Array.isArray(options)
      ? options.map(parseOption).filter((option) => option !== null)
      : [],
  };
}

export function parseTrackedOrder(data: Json): TrackedOrder | null {
  if (!isJsonObject(data)) return null;

  const {
    id,
    order_number,
    status,
    order_type,
    payment_method,
    customer_name,
    customer_phone,
    customer_address,
    notes,
    subtotal,
    delivery_fee,
    total,
    created_at,
    items,
  } = data;

  if (
    typeof id !== "string" ||
    typeof order_number !== "string" ||
    !isOrderStatus(status) ||
    typeof customer_name !== "string" ||
    typeof created_at !== "string" ||
    !Array.isArray(items)
  ) {
    return null;
  }

  return {
    id,
    orderNumber: order_number,
    status,
    orderType: order_type === "delivery" ? "delivery" : "pickup",
    paymentMethod: isPaymentMethod(payment_method) ? payment_method : null,
    customerName: customer_name,
    customerPhone: typeof customer_phone === "string" ? customer_phone : "",
    customerAddress: typeof customer_address === "string" ? customer_address : null,
    notes: typeof notes === "string" ? notes : null,
    subtotal: Number(subtotal),
    deliveryFee: Number(delivery_fee),
    total: Number(total),
    createdAt: created_at,
    items: items.map(parseItem).filter((item) => item !== null),
  };
}

/*
 * Texto de una opción guardada:
 *   "Elegí tu helado: Crema" · "Sin Cebolla" · "Obs.: bien cocida"
 */
export function savedOptionText(option: SavedOrderOption) {
  if (option.name === "Sin") return `Sin ${option.value}`;
  if (option.name === "Observaciones") return `Obs.: ${option.value}`;
  return `${option.name}: ${option.value}`;
}

/*
 * =====================================================================
 * Errores → mensajes para el usuario
 * =====================================================================
 */

const OPTIONS_CHANGED =
  "Cambiaron las opciones de un producto. Quitalo del carrito y volvé a agregarlo.";

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  STORE_PAUSED: "En este momento no estamos tomando pedidos. Probá en un rato.",
  STORE_CLOSED: "Ahora estamos cerrados. Podés hacer tu pedido cuando abramos.",
  INVALID_NAME: "Revisá tu nombre.",
  INVALID_PHONE:
    "Revisá tu teléfono: tiene que tener entre 8 y 15 números, con código de área.",
  INVALID_ADDRESS: "Necesitamos calle y número para el delivery.",
  MISSING_LOCATION: "Marcá tu ubicación en el mapa para el delivery.",
  OUT_OF_RANGE:
    "Tu dirección está fuera de nuestra zona de delivery. Podés elegir retiro en el local.",
  INVALID_ORDER_TYPE: "Elegí si querés delivery o retiro.",
  INVALID_PAYMENT_METHOD: "Elegí un método de pago.",
  DELIVERY_DISABLED:
    "En este momento no estamos haciendo delivery. Podés elegir retiro en el local.",
  TOO_MANY_ORDERS:
    "Recibimos varios pedidos seguidos desde este teléfono. Esperá unos minutos o escribinos por WhatsApp.",
  EMPTY_CART: "Tu carrito está vacío.",
  TOO_MANY_ITEMS: "El pedido tiene demasiados productos. Escribinos por WhatsApp.",
  INVALID_QUANTITY: "Revisá las cantidades de tu pedido.",
  PRODUCT_NOT_FOUND:
    "Uno de los productos ya no está en el menú. Quitalo del carrito para continuar.",
  PRODUCT_UNAVAILABLE:
    "Uno de los productos no está disponible ahora. Quitalo del carrito para continuar.",
  INVALID_OPTION: OPTIONS_CHANGED,
  MISSING_REQUIRED_OPTION: OPTIONS_CHANGED,
  INVALID_INGREDIENT: OPTIONS_CHANGED,
};

export const GENERIC_ORDER_ERROR =
  "No pudimos guardar tu pedido. Revisá tu conexión y probá de nuevo.";

export function orderErrorMessage(code: string | undefined) {
  return (code && ORDER_ERROR_MESSAGES[code]) || GENERIC_ORDER_ERROR;
}

/*
 * =====================================================================
 * WhatsApp (se arma con el pedido GUARDADO)
 * =====================================================================
 */

export function buildWhatsAppMessage(order: TrackedOrder, trackingUrl: string) {
  const lines: string[] = [];

  lines.push(`*${storeConfig.name.toUpperCase()}*`);
  lines.push(`Pedido *${order.orderNumber}*`);
  lines.push("");

  lines.push(`*Cliente:* ${order.customerName}`);
  lines.push(`*Teléfono:* ${order.customerPhone}`);
  lines.push(
    order.orderType === "delivery"
      ? `*Entrega:* Delivery — ${order.customerAddress ?? ""}`
      : `*Entrega:* ${orderTypeLabels.pickup}`
  );
  if (order.paymentMethod) {
    lines.push(`*Pago:* ${paymentMethodLabels[order.paymentMethod]}`);
  }
  lines.push("");

  lines.push("*Detalle*");

  order.items.forEach((item) => {
    lines.push(`${item.quantity}x ${item.productName} — ${formatPrice(item.totalPrice)}`);

    item.options.forEach((option) => {
      lines.push(`   • ${savedOptionText(option)}`);
    });
  });

  lines.push("");
  lines.push(`Subtotal: ${formatPrice(order.subtotal)}`);

  if (order.orderType === "delivery") {
    lines.push(
      `Envío: ${order.deliveryFee === 0 ? "Gratis" : formatPrice(order.deliveryFee)}`
    );
  }

  lines.push(`*Total: ${formatPrice(order.total)}*`);

  if (order.notes) {
    lines.push("");
    lines.push(`*Notas:* ${order.notes}`);
  }

  lines.push("");
  lines.push(`Seguimiento: ${trackingUrl}`);

  return lines.join("\n");
}

export function whatsAppUrl(whatsappNumber: string, message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
