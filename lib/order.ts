import type { CartItem } from "./cart";
import type { Json } from "./database.types";
import { formatPrice } from "./format";

import {
  type OrderType,
  type PaymentMethod,
  orderTypeLabels,
  paymentMethodLabels,
  storeConfig,
} from "@/app/data/store";

/*
 * =====================================================================
 * Detalle legible de una línea del carrito / pedido
 * =====================================================================
 * Un único lugar que decide cómo se muestran opciones, extras,
 * ingredientes quitados y observaciones (carrito, checkout,
 * confirmación y WhatsApp usan lo mismo).
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
 * Costo de envío (estimado en el front, definitivo en la base)
 * =====================================================================
 */

export function estimateDeliveryFee(
  orderType: OrderType | null,
  subtotal: number
) {
  if (orderType !== "delivery") {
    return 0;
  }

  return subtotal >= storeConfig.delivery.freeFrom
    ? 0
    : storeConfig.delivery.baseCost;
}

/*
 * =====================================================================
 * Payload para create_burger_house_order
 * =====================================================================
 * No se mandan precios: la base los calcula.
 */

export type CustomerData = {
  name: string;
  phone: string;
  address: string | null;
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

/*
 * =====================================================================
 * Respuesta de la base
 * =====================================================================
 * La confirmación y el WhatsApp usan SOLO estos datos: son exactamente
 * los precios y opciones que quedaron guardados en Supabase.
 */

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

export type SavedOrder = {
  id: string;
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: SavedOrderItem[];
};

type JsonObject = { [key: string]: Json | undefined };

function isJsonObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSavedOption(value: Json): SavedOrderOption | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const { option_name, option_value, price } = value;

  if (
    typeof option_name !== "string" ||
    typeof option_value !== "string" ||
    typeof price !== "number"
  ) {
    return null;
  }

  return { name: option_name, value: option_value, price };
}

function parseSavedItem(value: Json): SavedOrderItem | null {
  if (!isJsonObject(value)) {
    return null;
  }

  const { product_name, quantity, unit_price, total_price, options } = value;

  if (
    typeof product_name !== "string" ||
    typeof quantity !== "number" ||
    typeof unit_price !== "number" ||
    typeof total_price !== "number" ||
    !Array.isArray(options)
  ) {
    return null;
  }

  const parsedOptions = options.map(parseSavedOption);

  if (parsedOptions.some((option) => option === null)) {
    return null;
  }

  return {
    productName: product_name,
    quantity,
    unitPrice: unit_price,
    totalPrice: total_price,
    options: parsedOptions.filter(
      (option): option is SavedOrderOption => option !== null
    ),
  };
}

export function parseSavedOrder(data: Json): SavedOrder | null {
  if (!isJsonObject(data)) {
    return null;
  }

  const { id, order_number, subtotal, delivery_fee, total, items } = data;

  if (
    typeof id !== "string" ||
    typeof order_number !== "string" ||
    typeof subtotal !== "number" ||
    typeof delivery_fee !== "number" ||
    typeof total !== "number" ||
    !Array.isArray(items)
  ) {
    return null;
  }

  const parsedItems = items.map(parseSavedItem);

  if (parsedItems.some((item) => item === null)) {
    return null;
  }

  return {
    id,
    orderNumber: order_number,
    subtotal,
    deliveryFee: delivery_fee,
    total,
    items: parsedItems.filter(
      (item): item is SavedOrderItem => item !== null
    ),
  };
}

/*
 * Texto de una opción guardada:
 *   "Elegí tu helado: Crema" · "Sin Cebolla" · "Obs.: bien cocida"
 */
export function savedOptionText(option: SavedOrderOption) {
  if (option.name === "Sin") {
    return `Sin ${option.value}`;
  }

  if (option.name === "Observaciones") {
    return `Obs.: ${option.value}`;
  }

  return `${option.name}: ${option.value}`;
}

export type ConfirmedOrder = SavedOrder & {
  customer: CustomerData;
};

/*
 * =====================================================================
 * Errores → mensajes para el usuario
 * =====================================================================
 * La función SQL lanza códigos cortos. Nunca mostramos el error técnico.
 */

const OPTIONS_CHANGED =
  "Cambiaron las opciones de un producto. Quitalo del carrito y volvé a agregarlo.";

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  INVALID_NAME: "Revisá tu nombre.",
  INVALID_PHONE:
    "Revisá tu teléfono: tiene que tener entre 8 y 15 números, con código de área.",
  INVALID_ADDRESS: "Necesitamos calle y número para el delivery.",
  INVALID_ORDER_TYPE: "Elegí si querés delivery o retiro.",
  INVALID_PAYMENT_METHOD: "Elegí un método de pago.",
  DELIVERY_DISABLED:
    "En este momento no estamos haciendo delivery. Podés elegir retiro en el local.",
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
 * WhatsApp
 * =====================================================================
 */

export function buildWhatsAppMessage(order: ConfirmedOrder) {
  const { customer } = order;
  const lines: string[] = [];

  lines.push(`*${storeConfig.name.toUpperCase()}*`);
  lines.push(`Pedido *${order.orderNumber}*`);
  lines.push("");

  lines.push(`*Cliente:* ${customer.name}`);
  lines.push(`*Teléfono:* ${customer.phone}`);
  lines.push(
    customer.orderType === "delivery"
      ? `*Entrega:* Delivery — ${customer.address ?? ""}`
      : `*Entrega:* ${orderTypeLabels.pickup}`
  );
  lines.push(`*Pago:* ${paymentMethodLabels[customer.paymentMethod]}`);
  lines.push("");

  lines.push("*Detalle*");

  order.items.forEach((item) => {
    lines.push(
      `${item.quantity}x ${item.productName} — ${formatPrice(item.totalPrice)}`
    );

    item.options.forEach((option) => {
      lines.push(`   • ${savedOptionText(option)}`);
    });
  });

  lines.push("");
  lines.push(`Subtotal: ${formatPrice(order.subtotal)}`);

  if (customer.orderType === "delivery") {
    lines.push(
      `Envío: ${
        order.deliveryFee === 0 ? "Gratis" : formatPrice(order.deliveryFee)
      }`
    );
  }

  lines.push(`*Total: ${formatPrice(order.total)}*`);

  if (customer.notes) {
    lines.push("");
    lines.push(`*Notas:* ${customer.notes}`);
  }

  return lines.join("\n");
}

export function whatsAppUrl(order: ConfirmedOrder) {
  return `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent(
    buildWhatsAppMessage(order)
  )}`;
}
