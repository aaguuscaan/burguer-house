"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { storeConfig } from "../../data/store";

import { type CartSelection, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { isRemoteImage, productImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";

/*
 * =====================================================================
 * TIPOS
 * =====================================================================
 */

type OptionItem = {
  id: string;
  name: string;
  price: number;
};

type OptionGroup = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  items: OptionItem[];
};

type Ingredient = {
  id: string;
  name: string;
};

type ProductDetail = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badge: string | null;
  available: boolean;
  groups: OptionGroup[];
  ingredients: Ingredient[];
};

type LoadResult =
  | { status: "ready"; product: ProductDetail }
  | { status: "not-found" }
  | { status: "error" };

const NOTES_MAX_LENGTH = 300;
const MAX_QUANTITY = 99;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * =====================================================================
 * CARGA DESDE SUPABASE
 * =====================================================================
 *
 * Una sola consulta trae producto + grupos de opciones + ítems +
 * ingredientes. Si algo falla, falla todo: así nunca se muestra un
 * producto sin sus opciones obligatorias.
 */

function byOrder(
  a: { sort_order: number | null },
  b: { sort_order: number | null }
) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

async function fetchProduct(idOrSlug: string): Promise<LoadResult> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id, name, description, price, image_url, available, badge,
        product_options (
          id, name, selection_type, required, sort_order,
          product_option_items ( id, name, price, available, sort_order )
        ),
        product_ingredients ( id, name, sort_order, available )
      `
    )
    .eq("restaurant_id", storeConfig.restaurantId)
    .eq(UUID_PATTERN.test(idOrSlug) ? "id" : "slug", idOrSlug)
    .maybeSingle();

  if (error) {
    console.error("Error cargando producto:", error);
    return { status: "error" };
  }

  if (!data) {
    return { status: "not-found" };
  }

  const groups: OptionGroup[] = [...data.product_options]
    .sort(byOrder)
    .map(
      (group): OptionGroup => ({
      id: group.id,
      name: group.name,
      type: group.selection_type === "checkbox" ? "checkbox" : "radio",
      required: group.required ?? false,
      items: [...group.product_option_items]
        .filter((item) => item.available !== false)
        .sort(byOrder)
        .map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price ?? 0),
        })),
      })
    )
    .filter((group) => group.items.length > 0);

  const ingredients: Ingredient[] = [...data.product_ingredients]
    .filter((ingredient) => ingredient.available !== false)
    .sort(byOrder)
    .map((ingredient) => ({ id: ingredient.id, name: ingredient.name }));

  return {
    status: "ready",
    product: {
      id: data.id,
      name: data.name,
      description: data.description ?? "",
      price: Number(data.price),
      image: productImage(data.image_url),
      badge: data.badge,
      available: data.available ?? true,
      groups,
      ingredients,
    },
  };
}

/*
 * =====================================================================
 * PÁGINA
 * =====================================================================
 */

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  /*
   * Guardamos para qué id es el resultado: si el usuario navega a otro
   * producto, el resultado viejo deja de valer y se muestra "cargando".
   */
  const [loaded, setLoaded] = useState<{
    productId: string;
    result: LoadResult;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchProduct(productId)
      .catch((error: unknown): LoadResult => {
        console.error("Error inesperado cargando producto:", error);
        return { status: "error" };
      })
      .then((result) => {
        if (!cancelled) {
          setLoaded({ productId, result });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!loaded || loaded.productId !== productId) {
    return <ProductSkeleton />;
  }

  const { result } = loaded;

  if (result.status !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="max-w-sm text-center">
          <p className="text-5xl">{result.status === "error" ? "😕" : "🍔"}</p>

          <h1 className="mt-5 text-2xl font-black">
            {result.status === "error"
              ? "No pudimos cargar el producto"
              : "Producto no encontrado"}
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            {result.status === "error"
              ? "Revisá tu conexión y volvé a intentar."
              : "Puede que ya no esté en el menú."}
          </p>

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
   * key: al cambiar de producto se reinician las selecciones.
   */
  return <ProductView key={result.product.id} product={result.product} />;
}

/*
 * =====================================================================
 * VISTA + PERSONALIZACIÓN
 * =====================================================================
 */

function ProductView({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { addToCart, totalItems } = useCart();

  /* groupId → ids de ítems elegidos */
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  /* ---------------- Derivados (sin memo: son cálculos baratos) ------ */

  const selectedItems = (group: OptionGroup) =>
    group.items.filter((item) => selected[group.id]?.includes(item.id));

  const toSelections = (group: OptionGroup): CartSelection[] =>
    selectedItems(group).map((item) => ({
      groupId: group.id,
      groupName: group.name,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
    }));

  const options = product.groups
    .filter((group) => group.type === "radio")
    .flatMap(toSelections);

  const extras = product.groups
    .filter((group) => group.type === "checkbox")
    .flatMap(toSelections);

  const missingGroups = product.groups.filter(
    (group) => group.required && selectedItems(group).length === 0
  );

  const unitPrice = [...options, ...extras].reduce(
    (total, selection) => total + selection.price,
    product.price
  );

  /* ---------------- Acciones --------------------------------------- */

  const toggleItem = (group: OptionGroup, itemId: string) => {
    setSelected((current) => {
      const currentIds = current[group.id] ?? [];
      const isSelected = currentIds.includes(itemId);

      let nextIds: string[];

      if (group.type === "radio") {
        /* En un grupo opcional se puede deseleccionar. */
        nextIds = isSelected && !group.required ? [] : [itemId];
      } else {
        nextIds = isSelected
          ? currentIds.filter((id) => id !== itemId)
          : [...currentIds, itemId];
      }

      return { ...current, [group.id]: nextIds };
    });
  };

  const toggleIngredient = (ingredientId: string) => {
    setRemovedIds((current) =>
      current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId]
    );
  };

  const handleAddToCart = () => {
    if (!product.available) {
      return;
    }

    if (missingGroups.length > 0) {
      setShowErrors(true);

      document
        .getElementById(`group-${missingGroups[0].id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      quantity,
      options,
      extras,
      removedIngredients: product.ingredients.filter((ingredient) =>
        removedIds.includes(ingredient.id)
      ),
      notes,
    });

    router.push("/cart");
  };

  /* ---------------- UI --------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#090909] pb-8 text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#090909]/90 px-5 py-4 backdrop-blur-xl">
        <Link
          href="/"
          aria-label="Volver al menú"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-xl"
        >
          ←
        </Link>

        <p className="truncate text-sm font-black">{product.name}</p>

        <Link
          href="/cart"
          aria-label="Ver carrito"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#141414]"
        >
          🛒
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black">
              {totalItems}
            </span>
          )}
        </Link>
      </header>

      <div className="relative aspect-square w-full overflow-hidden bg-[#111] sm:mx-auto sm:mt-6 sm:max-w-xl sm:rounded-3xl">
        <Image
          src={product.image}
          alt={product.name}
          fill
          preload
          unoptimized={isRemoteImage(product.image)}
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
        <h1 className="text-3xl font-black tracking-tight">{product.name}</h1>

        {product.description && (
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {product.description}
          </p>
        )}

        <p className="mt-5 text-2xl font-black">
          {formatPrice(product.price)}
        </p>

        {!product.available && (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-300">
            Este producto no está disponible por ahora.
          </div>
        )}

        {/* GRUPOS DE OPCIONES */}

        {product.groups.map((group) => {
          const hasError =
            showErrors && missingGroups.some((item) => item.id === group.id);

          return (
            <section
              key={group.id}
              id={`group-${group.id}`}
              className="mt-8 scroll-mt-24"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{group.name}</h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    {group.type === "radio"
                      ? "Elegí una opción"
                      : "Podés elegir varias"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                    hasError
                      ? "bg-red-600 text-white"
                      : group.required
                        ? "bg-white/10 text-neutral-300"
                        : "bg-transparent text-neutral-600"
                  }`}
                >
                  {group.required ? "Obligatorio" : "Opcional"}
                </span>
              </div>

              {hasError && (
                <p role="alert" className="mb-3 text-xs font-bold text-red-400">
                  Elegí una opción para continuar.
                </p>
              )}

              <div className="space-y-2">
                {group.items.map((item) => {
                  const isSelected =
                    selected[group.id]?.includes(item.id) ?? false;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role={group.type === "radio" ? "radio" : "checkbox"}
                      aria-checked={isSelected}
                      onClick={() => toggleItem(group, item.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? "border-red-600 bg-red-600/10"
                          : hasError
                            ? "border-red-500/40 bg-[#141414]"
                            : "border-white/10 bg-[#141414] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                            group.type === "radio"
                              ? "rounded-full"
                              : "rounded-md"
                          } ${
                            isSelected
                              ? "border-red-500 bg-red-500"
                              : "border-white/20"
                          }`}
                        >
                          {isSelected &&
                            (group.type === "radio" ? (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            ) : (
                              <span className="text-[11px] font-black">✓</span>
                            ))}
                        </span>

                        <span className="text-sm font-bold">{item.name}</span>
                      </div>

                      {item.price > 0 && (
                        <span className="shrink-0 text-sm font-black text-red-400">
                          + {formatPrice(item.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* INGREDIENTES */}

        {product.ingredients.length > 0 && (
          <section className="mt-8">
            <div className="mb-3">
              <h2 className="text-lg font-black">¿Querés sacar algo?</h2>

              <p className="mt-1 text-xs text-neutral-500">
                Tocá un ingrediente para quitarlo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.ingredients.map((ingredient) => {
                const isRemoved = removedIds.includes(ingredient.id);

                return (
                  <button
                    key={ingredient.id}
                    type="button"
                    aria-pressed={isRemoved}
                    onClick={() => toggleIngredient(ingredient.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${
                      isRemoved
                        ? "border-red-600 bg-red-600/10 text-red-300"
                        : "border-white/10 bg-[#141414] text-neutral-200 hover:border-white/20"
                    }`}
                  >
                    {isRemoved ? (
                      <>
                        <span className="mr-1 font-black">Sin</span>
                        <span className="line-through decoration-2">
                          {ingredient.name}
                        </span>
                      </>
                    ) : (
                      <>✓ {ingredient.name}</>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* OBSERVACIONES */}

        <section className="mt-8">
          <label htmlFor="product-notes" className="mb-3 block">
            <span className="block text-lg font-black">Observaciones</span>

            <span className="mt-1 block text-xs text-neutral-500">
              ¿Querés pedir algo especial? (opcional)
            </span>
          </label>

          <textarea
            id="product-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={NOTES_MAX_LENGTH}
            rows={3}
            placeholder="Ej: bien cocida, poco ketchup…"
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#141414] p-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-red-600"
          />

          <p className="mt-1 text-right text-[11px] text-neutral-600">
            {notes.length}/{NOTES_MAX_LENGTH}
          </p>
        </section>

        {/* CANTIDAD */}

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-black">Cantidad</h2>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#141414] p-3">
            <button
              type="button"
              aria-label="Restar uno"
              disabled={quantity <= 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl font-black transition active:scale-90 disabled:opacity-30"
            >
              −
            </button>

            <span className="text-lg font-black" aria-live="polite">
              {quantity}
            </span>

            <button
              type="button"
              aria-label="Sumar uno"
              disabled={quantity >= MAX_QUANTITY}
              onClick={() =>
                setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-xl font-black transition active:scale-90 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </section>

        {/* AGREGAR */}

        <div className="sticky bottom-4 mt-8">
          {showErrors && missingGroups.length > 0 && (
            <p
              role="alert"
              className="mb-2 rounded-xl bg-[#1a0d0d] px-4 py-2 text-center text-xs font-bold text-red-300"
            >
              Te falta elegir:{" "}
              {missingGroups.map((group) => group.name).join(", ")}
            </p>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.available}
            className="flex w-full items-center justify-between rounded-2xl bg-red-600 px-5 py-4 shadow-2xl shadow-red-950/40 transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none"
          >
            <span className="text-sm font-black uppercase tracking-wide">
              {product.available ? "Agregar al pedido" : "No disponible"}
            </span>

            <span className="text-lg font-black">
              {formatPrice(unitPrice * quantity)}
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}

/*
 * =====================================================================
 * SKELETON
 * =====================================================================
 */

function ProductSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#090909] text-white"
      aria-busy="true"
      aria-label="Cargando producto"
    >
      <div className="h-[73px] border-b border-white/10" />

      <div className="animate-pulse">
        <div className="aspect-square w-full bg-[#141414] sm:mx-auto sm:mt-6 sm:max-w-xl sm:rounded-3xl" />

        <div className="mx-auto max-w-xl px-5 pt-7">
          <div className="h-8 w-2/3 rounded-lg bg-white/10" />
          <div className="mt-4 h-4 w-full rounded bg-white/5" />
          <div className="mt-2 h-4 w-4/5 rounded bg-white/5" />
          <div className="mt-6 h-7 w-28 rounded-lg bg-white/10" />

          <div className="mt-10 space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-14 rounded-2xl bg-[#141414]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
