"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  badge: string | null;
  featured: boolean;
  sort_order: number;
};

const RESTAURANT_ID =
  "926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

export default function EditProductPage() {
  const params = useParams();

  const productId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [product, setProduct] =
    useState<Product | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [imageUrl, setImageUrl] =
    useState("");
  const [available, setAvailable] =
    useState(true);
  const [badge, setBadge] =
    useState("");
  const [featured, setFeatured] =
    useState(false);

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [saved, setSaved] =
    useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setError(
          "No se recibió el ID del producto."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      console.log(
        "Cargando producto:",
        productId
      );

      try {
        const productResult =
          await supabase
            .from("products")
            .select(
              "id, restaurant_id, category_id, name, slug, description, price, image_url, available, badge, featured, sort_order"
            )
            .eq("id", productId)
            .maybeSingle();

        console.log(
          "Resultado producto:",
          productResult
        );

        if (productResult.error) {
          console.error(
            "ERROR PRODUCTO:",
            productResult.error
          );

          setError(
            `Error cargando producto: ${productResult.error.message}`
          );

          setLoading(false);
          return;
        }

        if (!productResult.data) {
          setError(
            "No se encontró ningún producto con ese ID."
          );

          setLoading(false);
          return;
        }

        const loadedProduct =
          productResult.data as Product;

        setProduct(loadedProduct);

        setName(loadedProduct.name);
        setDescription(
          loadedProduct.description ?? ""
        );
        setPrice(
          String(loadedProduct.price)
        );
        setCategoryId(
          loadedProduct.category_id
        );
        setImageUrl(
          loadedProduct.image_url ?? ""
        );
        setAvailable(
          loadedProduct.available
        );
        setBadge(
          loadedProduct.badge ?? ""
        );
        setFeatured(
          loadedProduct.featured
        );

        const categoriesResult =
          await supabase
            .from("categories")
            .select("id, name")
            .eq(
              "restaurant_id",
              RESTAURANT_ID
            )
            .eq("active", true)
            .order("sort_order");

        console.log(
          "Resultado categorías:",
          categoriesResult
        );

        if (categoriesResult.error) {
          console.error(
            "ERROR CATEGORÍAS:",
            categoriesResult.error
          );

          setError(
            `Producto cargado, pero hubo un error cargando las categorías: ${categoriesResult.error.message}`
          );
        } else {
          setCategories(
            categoriesResult.data ?? []
          );
        }

        setLoading(false);
      } catch (err) {
        console.error(
          "ERROR GENERAL:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado."
        );

        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSave() {
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError(
        "Ingresá el nombre del producto."
      );
      return;
    }

    if (!price || Number(price) <= 0) {
      setError(
        "Ingresá un precio válido."
      );
      return;
    }

    if (!categoryId) {
      setError(
        "Seleccioná una categoría."
      );
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: name.trim(),
        slug: createSlug(name),
        description:
          description.trim() || null,
        price: Number(price),
        category_id: categoryId,
        image_url:
          imageUrl.trim() || null,
        available,
        badge:
          badge.trim() || null,
        featured,
      };

      console.log(
        "Actualizando producto:",
        productId,
        updateData
      );

      const updateResult =
        await supabase
          .from("products")
          .update(updateData)
          .eq("id", productId)
          .select()
          .single();

      console.log(
        "Resultado actualización:",
        updateResult
      );

      if (updateResult.error) {
        console.error(
          "ERROR ACTUALIZANDO:",
          updateResult.error
        );

        setError(
          `No se pudo guardar: ${updateResult.error.message}`
        );

        setSaving(false);
        return;
      }

      if (updateResult.data) {
        setProduct(
          updateResult.data as Product
        );
      }

      setSaved(true);
    } catch (err) {
      console.error(
        "ERROR GENERAL GUARDANDO:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error guardando."
      );
    }

    setSaving(false);
  }

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

  if (!product) {
    return (
      <main className="min-h-screen bg-[#090909] p-6 text-white">
        <div className="mx-auto max-w-2xl pt-20 text-center">
          <div className="text-5xl">
            😕
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Producto no encontrado
          </h1>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left text-sm text-red-400">
              {error}
            </div>
          )}

          <Link
            href="/admin/products"
            className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-black"
          >
            ← Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-7 lg:min-h-20 lg:px-10">
          <div>
            <Link
              href="/admin/products"
              className="text-xs font-black uppercase tracking-[0.25em] text-red-500"
            >
              Productos
            </Link>

            <h1 className="mt-1 text-lg font-black sm:text-xl">
              Editar producto
            </h1>
          </div>

          <Link
            href="/admin/products"
            className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs font-bold text-neutral-300 transition hover:border-white/20"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-5 sm:p-7 lg:p-10">
        {/* SUCCESS */}

        {saved && (
          <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <p className="font-black text-green-400">
              ✓ Producto actualizado
            </p>

            <p className="mt-1 text-sm text-green-400/70">
              Los cambios se guardaron
              correctamente.
            </p>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
          {/* FORM */}

          <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7">
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                Información
              </p>

              <h2 className="mt-1 text-xl font-black">
                Datos del producto
              </h2>
            </div>

            <div className="space-y-5">
              <Field
                label="Nombre"
                required
              >
                <input
                  id="product-name"
                  name="product-name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  className="input"
                  placeholder="Ej: Doble Bacon"
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  id="product-description"
                  name="product-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="input resize-none"
                  placeholder="Descripción del producto..."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Precio"
                  required
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                      $
                    </span>

                    <input
                      id="product-price"
                      name="product-price"
                      type="number"
                      min="0"
                      value={price}
                      onChange={(event) =>
                        setPrice(
                          event.target.value
                        )
                      }
                      className="input pl-9"
                    />
                  </div>
                </Field>

                <Field
                  label="Categoría"
                  required
                >
                  <select
                    id="product-category"
                    name="product-category"
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(
                        event.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Seleccioná una categoría
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              </div>

              <Field label="Imagen">
                <input
                  id="product-image"
                  name="product-image"
                  value={imageUrl}
                  onChange={(event) =>
                    setImageUrl(
                      event.target.value
                    )
                  }
                  className="input"
                  placeholder="/images/products/producto.jpg"
                />
              </Field>

              <Field label="Badge">
                <input
                  id="product-badge"
                  name="product-badge"
                  value={badge}
                  onChange={(event) =>
                    setBadge(
                      event.target.value
                    )
                  }
                  className="input"
                  placeholder="Ej: MÁS VENDIDO, NUEVO, COMBO"
                />
              </Field>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#181818] p-4">
                <div>
                  <p className="text-sm font-bold">
                    Producto disponible
                  </p>

                  <p className="mt-1 text-xs text-neutral-600">
                    Determina si el producto
                    está disponible para
                    comprar.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cambiar disponibilidad"
                  onClick={() =>
                    setAvailable(
                      !available
                    )
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    available
                      ? "bg-green-500"
                      : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      available
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              <label
                htmlFor="product-featured"
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-[#181818] p-4"
              >
                <input
                  id="product-featured"
                  name="product-featured"
                  type="checkbox"
                  checked={featured}
                  onChange={(event) =>
                    setFeatured(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-red-600"
                />

                <span>
                  <span className="block text-sm font-bold">
                    Producto destacado
                  </span>

                  <span className="mt-1 block text-xs text-neutral-600">
                    Puede aparecer como
                    producto destacado en
                    la tienda.
                  </span>
                </span>
              </label>
            </div>

            {/* ACTIONS */}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/products"
                className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-4 text-center text-sm font-black transition hover:bg-[#1c1c1c]"
              >
                Cancelar
              </Link>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-red-600 px-7 py-4 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </section>

          {/* PREVIEW */}

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111]">
              <div className="border-b border-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-600">
                  Vista previa
                </p>

                <h2 className="mt-1 font-black">
                  Producto
                </h2>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#141414]">
                  <div className="relative h-48 overflow-hidden bg-[#1b1b1b]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={
                          name ||
                          "Producto"
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-6xl opacity-30">
                        🍔
                      </div>
                    )}

                    {!available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase">
                          Agotado
                        </span>
                      </div>
                    )}

                    {badge && (
                      <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[9px] font-black uppercase tracking-wide">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                      {categories.find(
                        (category) =>
                          category.id ===
                          categoryId
                      )?.name ??
                        "Categoría"}
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      {name ||
                        "Nombre del producto"}
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-neutral-500">
                      {description ||
                        "La descripción aparecerá aquí."}
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-lg font-black">
                        $
                        {price
                          ? Number(
                              price
                            ).toLocaleString(
                              "es-AR"
                            )
                          : "0"}
                      </span>

                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-2xl">
                        +
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ================================= */
/* FIELD */
/* ================================= */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-neutral-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

