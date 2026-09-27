"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CartExtra,
  CartOption,
  useCart,
} from "../../context/CartContext";

import { supabase } from "@/lib/supabase";

type DatabaseProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  badge: string | null;
  featured: boolean;
};

type DatabaseOptionItem = {
  id: string;
  option_group_id: string;
  name: string;
  price: number | null;
  available: boolean | null;
  sort_order: number | null;
};

type DatabaseProductOption = {
  id: string;
  product_id: string;
  name: string;
  selection_type: "radio" | "checkbox";
  required: boolean | null;
  sort_order: number | null;
  product_option_items: DatabaseOptionItem[];
};

type DatabaseIngredient = {
  id: string;
  product_id: string;
  name: string;
  sort_order: number | null;
  available: boolean | null;
};

type ProductOption = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required?: boolean;
  options: {
    id: string;
    name: string;
    price: number;
  }[];
};

type ProductIngredient = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge?: string;
  options?: ProductOption[];
  removableIngredients?: ProductIngredient[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();

  const { addToCart } = useCart();

  const productId = String(params.id);

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>({});

  const [selectedExtras, setSelectedExtras] =
    useState<string[]>([]);

  const [removedIngredients, setRemovedIngredients] =
    useState<string[]>([]);

  const [quantity, setQuantity] =
    useState(1);

  const [notes, setNotes] =
    useState("");

  /*
   * =====================================
   * CARGAR PRODUCTO DESDE SUPABASE
   * =====================================
   */

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);

      try {
        /*
         * ---------------------------------
         * PRODUCTO
         * ---------------------------------
         */

        let { data, error } = await supabase
          .from("products")
          .select(
            "id,name,slug,description,price,image_url,available,badge,featured"
          )
          .eq("id", productId)
          .maybeSingle();

        /*
         * Si no encontramos por UUID,
         * intentamos buscar por slug.
         */

        if (!data && !error) {
          const result = await supabase
            .from("products")
            .select(
              "id,name,slug,description,price,image_url,available,badge,featured"
            )
            .eq("slug", productId)
            .maybeSingle();

          data = result.data;
          error = result.error;
        }

        if (error) {
          console.error(
            "ERROR PRODUCTO:",
            error
          );

          setProduct(null);
          setLoading(false);

          return;
        }

        if (!data) {
          setProduct(null);
          setLoading(false);

          return;
        }

        const databaseProduct =
          data as DatabaseProduct;

        /*
         * ---------------------------------
         * OPCIONES
         * ---------------------------------
         */

        const {
          data: optionGroups,
          error: optionsError,
        } = await supabase
          .from("product_options")
          .select(
            `
              id,
              product_id,
              name,
              selection_type,
              required,
              sort_order,
              product_option_items (
                id,
                option_group_id,
                name,
                price,
                available,
                sort_order
              )
            `
          )
          .eq(
            "product_id",
            databaseProduct.id
          )
          .order("sort_order", {
            ascending: true,
          });

        if (optionsError) {
          console.error(
            "ERROR OPCIONES:",
            optionsError
          );
        }

        /*
         * ---------------------------------
         * INGREDIENTES
         * ---------------------------------
         */

        const {
          data: ingredients,
          error: ingredientsError,
        } = await supabase
          .from("product_ingredients")
          .select(
            `
              id,
              product_id,
              name,
              sort_order,
              available
            `
          )
          .eq(
            "product_id",
            databaseProduct.id
          )
          .eq("available", true)
          .order("sort_order", {
            ascending: true,
          });

        if (ingredientsError) {
          console.error(
            "ERROR INGREDIENTES:",
            ingredientsError
          );
        }

        /*
         * ---------------------------------
         * FORMATEAR OPCIONES
         * ---------------------------------
         */

        const formattedOptions: ProductOption[] =
          (
            optionGroups as
              | DatabaseProductOption[]
              | null
          )
            ?.map((group) => ({
              id: group.id,

              name: group.name,

              type: group.selection_type,

              required:
                group.required ?? false,

              options:
                (
                  group.product_option_items ??
                  []
                )
                  .filter(
                    (item) =>
                      item.available !== false
                  )
                  .sort(
                    (a, b) =>
                      (a.sort_order ?? 0) -
                      (b.sort_order ?? 0)
                  )
                  .map((item) => ({
                    id: item.id,

                    name: item.name,

                    price: Number(
                      item.price ?? 0
                    ),
                  })),
            })) ?? [];

        /*
         * ---------------------------------
         * FORMATEAR INGREDIENTES
         * ---------------------------------
         */

        const formattedIngredients: ProductIngredient[] =
          (
            ingredients as
              | DatabaseIngredient[]
              | null
          )
            ?.filter(
              (ingredient) =>
                ingredient.available !== false
            )
            .sort(
              (a, b) =>
                (a.sort_order ?? 0) -
                (b.sort_order ?? 0)
            )
            .map((ingredient) => ({
              id: ingredient.id,

              name: ingredient.name,
            })) ?? [];

        /*
         * ---------------------------------
         * GUARDAR PRODUCTO EN STATE
         * ---------------------------------
         */

        setProduct({
          id: databaseProduct.id,

          name: databaseProduct.name,

          description:
            databaseProduct.description ??
            "",

          price: Number(
            databaseProduct.price
          ),

          image:
            databaseProduct.image_url ??
            "/images/products/placeholder.jpg",

          badge:
            databaseProduct.badge ??
            undefined,

          options:
            formattedOptions,

          removableIngredients:
            formattedIngredients,
        });
      } catch (error) {
        console.error(
          "ERROR CARGANDO PRODUCTO:",
          error
        );

        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  /*
   * =====================================
   * SELECCIONAR OPCIÓN RADIO
   * =====================================
   */

  const handleRadioChange = (
    option: ProductOption,
    value: string
  ) => {
    setSelectedOptions(
      (current) => ({
        ...current,
        [option.id]: value,
      })
    );
  };

  /*
   * =====================================
   * SELECCIONAR / QUITAR EXTRA
   * =====================================
   */

  const handleExtraChange = (
    extraId: string
  ) => {
    setSelectedExtras(
      (current) =>
        current.includes(extraId)
          ? current.filter(
              (id) =>
                id !== extraId
            )
          : [
              ...current,
              extraId,
            ]
    );
  };

  /*
   * =====================================
   * SELECCIONAR / QUITAR INGREDIENTE
   * =====================================
   */

  const handleIngredientChange = (
    ingredientId: string
  ) => {
    setRemovedIngredients(
      (current) =>
        current.includes(
          ingredientId
        )
          ? current.filter(
              (id) =>
                id !==
                ingredientId
            )
          : [
              ...current,
              ingredientId,
            ]
    );
  };

  /*
   * =====================================
   * OPCIONES SELECCIONADAS
   * =====================================
   */

  const selectedOptionObjects =
    useMemo<CartOption[]>(
      () => {
        if (!product?.options) {
          return [];
        }

        const result: CartOption[] =
          [];

        product.options.forEach(
          (option) => {
            if (
              option.type !==
              "radio"
            ) {
              return;
            }

            const selectedId =
              selectedOptions[
                option.id
              ];

            if (!selectedId) {
              return;
            }

            const selected =
              option.options.find(
                (item) =>
                  item.id ===
                  selectedId
              );

            if (selected) {
              result.push({
                id: `${option.id}-${selected.id}`,

                name: `${option.name}: ${selected.name}`,

                price:
                  selected.price,
              });
            }
          }
        );

        return result;
      },
      [
        product?.options,
        selectedOptions,
      ]
    );

  /*
   * =====================================
   * EXTRAS SELECCIONADOS
   * =====================================
   */

  const selectedExtraObjects =
    useMemo<CartExtra[]>(
      () => {
        if (!product?.options) {
          return [];
        }

        const result: CartExtra[] =
          [];

        product.options.forEach(
          (option) => {
            if (
              option.type !==
              "checkbox"
            ) {
              return;
            }

            option.options.forEach(
              (extra) => {
                const selectionId =
                  `${option.id}-${extra.id}`;

                if (
                  selectedExtras.includes(
                    selectionId
                  )
                ) {
                  result.push({
                    id: selectionId,

                    name: extra.name,

                    price:
                      extra.price,
                  });
                }
              }
            );
          }
        );

        return result;
      },
      [
        product?.options,
        selectedExtras,
      ]
    );

  /*
   * =====================================
   * PRECIO UNITARIO
   * =====================================
   */

  const unitPrice =
    (product?.price ?? 0) +
    selectedOptionObjects.reduce(
      (total, option) =>
        total + option.price,
      0
    ) +
    selectedExtraObjects.reduce(
      (total, extra) =>
        total + extra.price,
      0
    );

  /*
   * =====================================
   * PRECIO TOTAL
   * =====================================
   */

  const totalPrice =
    unitPrice * quantity;

  /*
   * =====================================
   * VALIDAR OPCIONES OBLIGATORIAS
   * =====================================
   */

  const requiredOptionsComplete =
    product?.options
      ?.filter(
        (option) =>
          option.required &&
          option.type ===
            "radio"
      )
      .every(
        (option) =>
          Boolean(
            selectedOptions[
              option.id
            ]
          )
      ) ?? true;

  /*
   * =====================================
   * INGREDIENTES REMOVIDOS
   * =====================================
   *
   * IMPORTANTE:
   *
   * Esto NO usa useMemo.
   *
   * Los ingredientes quitados quedan
   * separados de las observaciones.
   * =====================================
   */

  const removedIngredientNames =
    product?.removableIngredients
      ?.filter((ingredient) =>
        removedIngredients.includes(
          ingredient.id
        )
      )
      .map(
        (ingredient) =>
          ingredient.name
      ) ?? [];

  /*
   * =====================================
   * AGREGAR AL CARRITO
   * =====================================
   */

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    if (!requiredOptionsComplete) {
      alert(
        "Elegí todas las opciones obligatorias antes de continuar."
      );

      return;
    }

    addToCart({
      productId:
        product.id,

      name:
        product.name,

      image:
        product.image,

      basePrice:
        product.price,

      quantity,

      options:
        selectedOptionObjects,

      extras:
        selectedExtraObjects,

      /*
       * Los ingredientes removidos
       * van en su propio campo.
       */

      removedIngredients:
        removedIngredientNames,

      /*
       * Las observaciones son solamente
       * lo que escribió el cliente.
       */

      notes:
        notes.trim(),
    });

    router.push("/cart");
  };

  /*
   * =====================================
   * LOADING
   * =====================================
   */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <div className="text-center">
          <div className="text-5xl">
            🍔
          </div>

          <p className="mt-4 text-sm font-bold text-neutral-500">
            Cargando producto...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * PRODUCTO NO ENCONTRADO
   * =====================================
   */

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="text-center">
          <p className="text-5xl">
            🍔
          </p>

          <h1 className="mt-5 text-2xl font-black">
            Producto no encontrado
          </h1>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-red-600 px-6 py-3 text-sm font-black"
          >
            Volver al menú
          </Link>
        </div>
      </main>
    );
  }

  /*
   * =====================================
   * INTERFAZ
   * =====================================
   */

  return (
    <main className="min-h-screen bg-[#090909] pb-8 text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl"
        >
          ←
        </Link>

        <p className="text-sm font-black">
          {product.name}
        </p>

        <Link
          href="/cart"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414]"
        >
          🛒
        </Link>
      </header>

      <div className="relative aspect-square w-full overflow-hidden bg-[#111] sm:mx-auto sm:mt-6 sm:max-w-xl sm:rounded-3xl">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {product.badge && (
          <span className="absolute bottom-5 left-5 rounded-full bg-red-600 px-4 py-2 text-xs font-black">
            {product.badge}
          </span>
        )}
      </div>

      <section className="mx-auto max-w-xl px-5 pt-7">
        <h1 className="text-3xl font-black tracking-tight">
          {product.name}
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-400">
          {product.description}
        </p>

        <p className="mt-5 text-2xl font-black">
          {formatPrice(
            product.price
          )}
        </p>

        {product.options?.map(
          (option) => (
            <section
              key={option.id}
              className="mt-8"
            >
              <div className="mb-3">
                <h2 className="text-lg font-black">
                  {option.name}
                </h2>

                {option.required && (
                  <p className="mt-1 text-xs text-red-400">
                    Elegí una opción
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {option.options.map(
                  (item) => {
                    const selectionId =
                      `${option.id}-${item.id}`;

                    const isSelected =
                      option.type ===
                      "radio"
                        ? selectedOptions[
                            option.id
                          ] ===
                          item.id
                        : selectedExtras.includes(
                            selectionId
                          );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (
                            option.type ===
                            "radio"
                          ) {
                            handleRadioChange(
                              option,
                              item.id
                            );
                          } else {
                            handleExtraChange(
                              selectionId
                            );
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-red-600 bg-red-600/10"
                            : "border-white/10 bg-[#141414] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-red-500 bg-red-500"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>

                          <span className="text-sm font-bold">
                            {item.name}
                          </span>
                        </div>

                        {item.price >
                          0 && (
                          <span className="text-sm font-black text-red-400">
                            +
                            {" "}
                            {formatPrice(
                              item.price
                            )}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )
        )}

        {product.removableIngredients &&
          product
            .removableIngredients
            .length > 0 && (
            <section className="mt-8">
              <div className="mb-3">
                <h2 className="text-lg font-black">
                  ¿Querés sacar algún ingrediente?
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  Seleccioná los ingredientes que no querés.
                </p>
              </div>

              <div className="space-y-2">
                {product.removableIngredients.map(
                  (ingredient) => {
                    const isRemoved =
                      removedIngredients.includes(
                        ingredient.id
                      );

                    return (
                      <button
                        key={
                          ingredient.id
                        }
                        type="button"
                        onClick={() =>
                          handleIngredientChange(
                            ingredient.id
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                          isRemoved
                            ? "border-red-600 bg-red-600/10"
                            : "border-white/10 bg-[#141414] hover:border-white/20"
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {
                            ingredient.name
                          }
                        </span>

                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                            isRemoved
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-white/20 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )}

        <section className="mt-8">
          <div className="mb-3">
            <h2 className="text-lg font-black">
              Observaciones
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              ¿Querés pedir algo especial?
            </p>
          </div>

          <textarea
            id="product-notes"
            name="product-notes"
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            rows={4}
            placeholder="Ej: Poco ketchup, bien cocida..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#141414] p-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-red-600"
          />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-black">
            Cantidad
          </h2>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#141414] p-3">
            <button
              type="button"
              onClick={() =>
                setQuantity(
                  Math.max(
                    1,
                    quantity - 1
                  )
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl font-black"
            >
              −
            </button>

            <span className="text-lg font-black">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() =>
                setQuantity(
                  quantity + 1
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-xl font-black"
            >
              +
            </button>
          </div>
        </section>


        <div className="sticky bottom-4 mt-8">
          <button
            type="button"
            onClick={
              handleAddToCart
            }
            className="flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 shadow-2xl shadow-red-950/40 transition hover:bg-red-500 active:scale-[0.98]"
          >
            <span className="text-sm font-black uppercase tracking-wide">
              Agregar al pedido
            </span>

            <span className="text-lg font-black">
              {formatPrice(
                totalPrice
              )}
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}