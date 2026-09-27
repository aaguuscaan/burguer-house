"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type CartOption = {
  id: string;
  name: string;
  price: number;
};

export type CartExtra = {
  id: string;
  name: string;
  price: number;
};

export type CartItem = {
  cartId: string;
  productId: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;

  options: CartOption[];
  extras: CartExtra[];

  removedIngredients: string[];
  notes: string;

  unitPrice: number;
};

type AddToCartData = {
  productId: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;

  options?: CartOption[];
  extras?: CartExtra[];

  removedIngredients?: string[];
  notes?: string;
};

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;

  addToCart: (item: AddToCartData) => void;

  removeFromCart: (cartId: string) => void;

  increaseQuantity: (cartId: string) => void;

  decreaseQuantity: (cartId: string) => void;

  clearCart: () => void;
};

const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] =
    useState<CartItem[]>([]);

  /*
   * =====================================
   * AGREGAR AL CARRITO
   * =====================================
   */

  const addToCart = (
    item: AddToCartData
  ) => {
    const options =
      item.options ?? [];

    const extras =
      item.extras ?? [];

    const removedIngredients =
      item.removedIngredients ?? [];

    const notes =
      item.notes ?? "";

    /*
     * Precio de las opciones
     */

    const optionsPrice =
      options.reduce(
        (total, option) =>
          total + option.price,
        0
      );

    /*
     * Precio de los extras
     */

    const extrasPrice =
      extras.reduce(
        (total, extra) =>
          total + extra.price,
        0
      );

    /*
     * Precio final de UNA unidad
     */

    const unitPrice =
      item.basePrice +
      optionsPrice +
      extrasPrice;

    /*
     * Crear producto dentro del carrito
     */

    const cartItem: CartItem = {
      cartId:
        `${item.productId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      productId:
        item.productId,

      name:
        item.name,

      image:
        item.image,

      basePrice:
        item.basePrice,

      quantity:
        item.quantity,

      options,

      extras,

      removedIngredients,

      notes,

      unitPrice,
    };

    setItems(
      (current) => [
        ...current,
        cartItem,
      ]
    );
  };

  /*
   * =====================================
   * ELIMINAR PRODUCTO
   * =====================================
   */

  const removeFromCart = (
    cartId: string
  ) => {
    setItems(
      (current) =>
        current.filter(
          (item) =>
            item.cartId !== cartId
        )
    );
  };

  /*
   * =====================================
   * AUMENTAR CANTIDAD
   * =====================================
   */

  const increaseQuantity = (
    cartId: string
  ) => {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.cartId === cartId
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
        )
    );
  };

  /*
   * =====================================
   * DISMINUIR CANTIDAD
   * =====================================
   */

  const decreaseQuantity = (
    cartId: string
  ) => {
    setItems(
      (current) =>
        current
          .map(
            (item) =>
              item.cartId === cartId
                ? {
                    ...item,
                    quantity:
                      item.quantity - 1,
                  }
                : item
          )
          .filter(
            (item) =>
              item.quantity > 0
          )
    );
  };

  /*
   * =====================================
   * VACIAR CARRITO
   * =====================================
   */

  const clearCart = () => {
    setItems([]);
  };

  /*
   * =====================================
   * TOTAL DE PRODUCTOS
   * =====================================
   */

  const totalItems =
    useMemo(() => {
      return items.reduce(
        (total, item) =>
          total +
          item.quantity,
        0
      );
    }, [items]);

  /*
   * =====================================
   * PRECIO TOTAL
   * =====================================
   */

  const totalPrice =
    useMemo(() => {
      return items.reduce(
        (total, item) =>
          total +
          item.unitPrice *
            item.quantity,
        0
      );
    }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/*
 * =====================================
 * HOOK useCart
 * =====================================
 */

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe utilizarse dentro de CartProvider"
    );
  }

  return context;
}