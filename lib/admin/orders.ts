import {
  type OrderType,
  type PaymentMethod,
  storeConfig,
} from "@/app/data/store";
import { supabase } from "@/lib/supabase";

/*
 * =====================================================================
 * Estados (mismos valores que la constraint orders_status_check)
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

export const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value);
}

export function statusLabel(status: OrderStatus, orderType: OrderType) {
  switch (status) {
    case "pending":
      return "Nuevo";
    case "confirmed":
      return "Confirmado";
    case "preparing":
      return "En preparación";
    case "ready":
      return orderType === "delivery" ? "Listo para enviar" : "Listo para retirar";
    case "delivered":
      return orderType === "delivery" ? "Entregado" : "Retirado";
    case "cancelled":
      return "Cancelado";
  }
}

export const statusClasses: Record<OrderStatus, string> = {
  pending: "bg-red-600 text-white",
  confirmed: "bg-blue-500/15 text-blue-300",
  preparing: "bg-yellow-500/15 text-yellow-300",
  ready: "bg-green-500/15 text-green-300",
  delivered: "bg-white/5 text-neutral-400",
  cancelled: "bg-white/5 text-neutral-500 line-through",
};

/* Próximo paso del flujo y el texto del botón. */
export function nextStep(
  status: OrderStatus,
  orderType: OrderType
): { status: OrderStatus; label: string } | null {
  switch (status) {
    case "pending":
      return { status: "confirmed", label: "Confirmar pedido" };
    case "confirmed":
      return { status: "preparing", label: "Empezar a preparar" };
    case "preparing":
      return { status: "ready", label: "Marcar como listo" };
    case "ready":
      return {
        status: "delivered",
        label: orderType === "delivery" ? "Marcar entregado" : "Marcar retirado",
      };
    default:
      return null;
  }
}

/*
 * =====================================================================
 * Carga
 * =====================================================================
 */

export type AdminOrderOption = {
  id: string;
  name: string;
  value: string;
  price: number;
};

export type AdminOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  options: AdminOrderOption[];
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  orderType: OrderType;
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
  createdAt: string;
  items: AdminOrderItem[];
};

const HISTORY_DAYS = 3;

/* Orden de las líneas: elecciones, después "Sin", después observaciones. */
function optionRank(name: string) {
  if (name === "Observaciones") return 2;
  if (name === "Sin") return 1;
  return 0;
}

function isPaymentMethod(value: string | null): value is PaymentMethod {
  return value === "cash" || value === "transfer" || value === "card";
}

export async function fetchAdminOrders(): Promise<AdminOrder[] | null> {
  const since = new Date(
    Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id, order_number, customer_name, customer_phone, customer_address,
        order_type, payment_method, status, subtotal, delivery_fee, total,
        notes, created_at,
        order_items (
          id, product_name, quantity, total_price, created_at,
          order_item_options ( id, option_name, option_value, price )
        )
      `
    )
    .eq("restaurant_id", storeConfig.restaurantId)
    .or(`created_at.gte."${since}",status.in.(${ACTIVE_STATUSES.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error cargando pedidos:", error);
    return null;
  }

  return data.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone ?? "",
    customerAddress: order.customer_address,
    orderType: order.order_type === "delivery" ? "delivery" : "pickup",
    paymentMethod: isPaymentMethod(order.payment_method)
      ? order.payment_method
      : null,
    status: isOrderStatus(order.status) ? order.status : "pending",
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.created_at ?? new Date(0).toISOString(),
    items: [...order.order_items]
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      .map((item) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        totalPrice: Number(item.total_price),
        options: [...item.order_item_options]
          .sort((a, b) => optionRank(a.option_name) - optionRank(b.option_name))
          .map((option) => ({
            id: option.id,
            name: option.option_name,
            value: option.option_value,
            price: Number(option.price ?? 0),
          })),
      })),
  }));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    console.error("Error actualizando estado:", error);
    return false;
  }

  return true;
}

/*
 * =====================================================================
 * WhatsApp al cliente
 * =====================================================================
 * Normaliza números argentinos: 11 2345 6789 → 5491123456789.
 */

export function customerWhatsAppUrl(order: AdminOrder) {
  let digits = order.customerPhone.replace(/\D/g, "").replace(/^00/, "");

  if (!digits.startsWith("54")) {
    digits = digits.replace(/^0/, "");
    digits = digits.length === 10 ? `549${digits}` : digits;
  }

  const firstName = order.customerName.split(" ")[0];
  const text = `¡Hola ${firstName}! Te escribimos de ${storeConfig.name} por tu pedido ${order.orderNumber}.`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
