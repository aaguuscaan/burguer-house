/*
 * Último pedido hecho desde este navegador (para mostrar "Tu pedido en
 * curso" en el menú). Solo guarda el id; los datos se consultan a la base.
 */

const KEY = "burger-house-last-order";

export function saveRecentOrder(orderId: string) {
  try {
    window.localStorage.setItem(KEY, orderId);
  } catch {
    /* Navegación privada o almacenamiento lleno: no es crítico. */
  }
}

export function readRecentOrder(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearRecentOrder() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
