import type { OrderStatus } from "./order";

import type { OrderType } from "@/app/data/store";

export const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

export function isActiveStatus(status: OrderStatus) {
  return ACTIVE_STATUSES.includes(status);
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

/* Texto para el cliente en la página de seguimiento. */
export function customerStatusText(
  status: OrderStatus,
  orderType: OrderType
): { title: string; detail: string; icon: string } {
  switch (status) {
    case "pending":
      return {
        icon: "📨",
        title: "Recibimos tu pedido",
        detail: "El local lo va a confirmar en unos minutos.",
      };
    case "confirmed":
      return {
        icon: "✅",
        title: "Pedido confirmado",
        detail: "Ya está en la lista de la cocina.",
      };
    case "preparing":
      return {
        icon: "🔥",
        title: "Lo estamos preparando",
        detail: "Falta poquito.",
      };
    case "ready":
      return orderType === "delivery"
        ? { icon: "🛵", title: "¡Tu pedido está listo!", detail: "Sale para tu casa en breve." }
        : { icon: "🛍️", title: "¡Listo para retirar!", detail: "Te esperamos en el local." };
    case "delivered":
      return {
        icon: "🎉",
        title: orderType === "delivery" ? "¡Pedido entregado!" : "¡Pedido retirado!",
        detail: "Gracias por elegirnos. ¡Que lo disfrutes!",
      };
    case "cancelled":
      return {
        icon: "✕",
        title: "Pedido cancelado",
        detail: "Si tenés dudas, escribinos por WhatsApp.",
      };
  }
}

/* Pasos que ve el cliente (sin "cancelado"). */
export const TRACKING_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
];

export function trackingStepLabel(step: OrderStatus, orderType: OrderType) {
  switch (step) {
    case "pending":
      return "Recibido";
    case "confirmed":
      return "Confirmado";
    case "preparing":
      return "Preparando";
    case "ready":
      return "Listo";
    default:
      return orderType === "delivery" ? "Entregado" : "Retirado";
  }
}
