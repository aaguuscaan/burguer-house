"use client";

import { useSyncExternalStore } from "react";

/*
 * =====================================================================
 * CARRITO
 * =====================================================================
 *
 * Store externo (en vez de Context + useState) para poder:
 *   - guardarlo en localStorage y sobrevivir a una recarga;
 *   - evitar errores de hidratación (el servidor siempre ve carrito vacío);
 *   - sincronizar entre pestañas.
 *
 * Cada línea del carrito se identifica por su configuración: mismo
 * producto + mismas opciones + mismos ingredientes quitados + mismas
 * observaciones = misma línea (se suma cantidad). Si algo cambia, es
 * otra línea.
 * =====================================================================
 */

export type CartSelection = {
  groupId: string;
  groupName: string;
  itemId: string;
  itemName: string;
  price: number;
};

export type CartIngredient = {
  id: string;
  name: string;
};

export type CartItem = {
  cartId: string;
  productId: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;

  /* Grupos de elección única (radio): tamaño, guarnición, salsa… */
  options: CartSelection[];

  /* Grupos de elección múltiple (checkbox): extras */
  extras: CartSelection[];

  removedIngredients: CartIngredient[];
  notes: string;

  /* Precio de UNA unidad con opciones y extras */
  unitPrice: number;
};

export type AddToCartData = Omit<CartItem, "cartId" | "unitPrice">;

const STORAGE_KEY = "burger-house-cart-v2";
const MAX_QUANTITY = 99;

/* Referencia estable para el render del servidor. */
const EMPTY_CART: CartItem[] = [];

let items: CartItem[] = EMPTY_CART;
let loaded = false;
const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ */
/* Persistencia                                                        */
/* ------------------------------------------------------------------ */

function isSelection(value: unknown): value is CartSelection {
  return (
    typeof value === "object" &&
    value !== null &&
    "itemId" in value &&
    typeof value.itemId === "string" &&
    "groupName" in value &&
    typeof value.groupName === "string" &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    "price" in value &&
    typeof value.price === "number"
  );
}

function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "cartId" in value &&
    typeof value.cartId === "string" &&
    "productId" in value &&
    typeof value.productId === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "image" in value &&
    typeof value.image === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    "unitPrice" in value &&
    typeof value.unitPrice === "number" &&
    "options" in value &&
    Array.isArray(value.options) &&
    value.options.every(isSelection) &&
    "extras" in value &&
    Array.isArray(value.extras) &&
    value.extras.every(isSelection) &&
    "removedIngredients" in value &&
    Array.isArray(value.removedIngredients) &&
    "notes" in value &&
    typeof value.notes === "string"
  );
}

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return EMPTY_CART;
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) && parsed.every(isCartItem)
      ? parsed
      : EMPTY_CART;
  } catch (error) {
    console.warn("No se pudo leer el carrito guardado:", error);
    return EMPTY_CART;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    items = readStorage();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setItems(update: (current: CartItem[]) => CartItem[]) {
  ensureLoaded();
  items = update(items);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("No se pudo guardar el carrito:", error);
  }

  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      items = readStorage();
      emit();
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return items;
}

function getServerSnapshot() {
  return EMPTY_CART;
}

/* ------------------------------------------------------------------ */
/* Cálculos                                                            */
/* ------------------------------------------------------------------ */

function sumPrices(selections: CartSelection[]) {
  return selections.reduce((total, selection) => total + selection.price, 0);
}

function configurationKey(data: AddToCartData) {
  const selectionIds = [...data.options, ...data.extras]
    .map((selection) => selection.itemId)
    .sort();

  const removedIds = data.removedIngredients
    .map((ingredient) => ingredient.id)
    .sort();

  return [
    data.productId,
    selectionIds.join(","),
    removedIds.join(","),
    data.notes.trim().toLowerCase(),
  ].join("|");
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

function addToCart(data: AddToCartData) {
  const cartId = configurationKey(data);
  const quantity = Math.min(Math.max(1, data.quantity), MAX_QUANTITY);

  setItems((current) => {
    const existing = current.find((item) => item.cartId === cartId);

    if (existing) {
      return current.map((item) =>
        item.cartId === cartId
          ? {
              ...item,
              quantity: Math.min(item.quantity + quantity, MAX_QUANTITY),
            }
          : item
      );
    }

    return [
      ...current,
      {
        ...data,
        cartId,
        quantity,
        notes: data.notes.trim(),
        unitPrice:
          data.basePrice + sumPrices(data.options) + sumPrices(data.extras),
      },
    ];
  });
}

function removeFromCart(cartId: string) {
  setItems((current) => current.filter((item) => item.cartId !== cartId));
}

function increaseQuantity(cartId: string) {
  setItems((current) =>
    current.map((item) =>
      item.cartId === cartId
        ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
        : item
    )
  );
}

function decreaseQuantity(cartId: string) {
  setItems((current) =>
    current
      .map((item) =>
        item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0)
  );
}

function clearCart() {
  setItems(() => EMPTY_CART);
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useCart() {
  const cartItems = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );

  return {
    items: cartItems,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
  };
}
