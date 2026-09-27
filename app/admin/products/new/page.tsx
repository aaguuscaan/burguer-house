"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
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
  created_at: string;
  updated_at: string;
};

const RESTAURANT_ID =
  "926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showOnlyAvailable, setShowOnlyAvailable] =
    useState(false);

  /*
   * ============================================
   * CARGAR DATOS
   * ============================================
   */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, categoriesResponse] =
        await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("restaurant_id", RESTAURANT_ID)
            .order("sort_order", {
              ascending: true,
            })
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("categories")
            .select(
              "id, name, slug, emoji"
            )
            .eq(
              "restaurant_id",
              RESTAURANT_ID
            )
            .eq("active", true)
            .order("sort_order", {
              ascending: true,
            }),
        ]);

      if (productsResponse.error) {
        throw productsResponse.error;
      }

      if (categoriesResponse.error) {
        throw categoriesResponse.error;
      }

      setProducts(
        (productsResponse.data ??
          []) as Product[]
      );

      setCategories(
        (categoriesResponse.data ??
          []) as Category[]
      );
    } catch (err) {
      console.error(
        "Error cargando productos:",
        err
      );

      setError(
        "No pudimos cargar los productos. Revisá la conexión con Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================
   * FILTROS
   * ============================================
   */

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search
      .toLowerCase()
      .trim();

    return products.filter((product) => {
      const matchesSearch =
        product.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        (product.description ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        category === "all" ||
        product.category_id === category;

      const matchesAvailability =
        !showOnlyAvailable ||
        product.available;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [
    products,
    search,
    category,
    showOnlyAvailable,
  ]);

  /*
   * ============================================
   * ESTADÍSTICAS
   * ============================================
   */

  const totalProducts = products.length;

  const availableProducts = products.filter(
    (product) => product.available
  ).length;

  const unavailableProducts =
    products.filter(
      (product) => !product.available
    ).length;

  const totalCategories = categories.length;

  /*
   * ============================================
   * RENDER
   * ============================================
   */

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-7 lg:h-20 lg:px-10">
          <div>
            <Link
              href="/admin"
              className="text-xs font-black uppercase tracking-[0.25em] text-red-500"
            >
              Burger House
            </Link>

            <h1 className="mt-1 text-lg font-black sm:text-xl">
              Productos
            </h1>
          </div>

          <Link
            href="/admin"
            className="hidden rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm font-bold transition hover:border-white/20 sm:block"
          >
            ← Dashboard
          </Link>

          <Link
            href="/admin/products/new"
            className="rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95 sm:text-sm"
          >
            + Nuevo producto
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5 sm:p-7 lg:p-10">
        {/* TITLE */}

        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            Catálogo
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black">
                Tu menú
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Administrá todos los productos que
                aparecen en tu tienda online.
              </p>
            </div>

            <div className="text-sm text-neutral-500">
              <span className="font-black text-white">
                {filteredProducts.length}
              </span>{" "}
              productos
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-7 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-400">
              {error}
            </p>

            <button
              onClick={loadData}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-black transition hover:bg-red-500"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* STATS */}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label="Productos"
            value={loading ? "—" : String(totalProducts)}
            icon="🍔"
          />

          <MiniStat
            label="Disponibles"
            value={
              loading
                ? "—"
                : String(availableProducts)
            }
            icon="✓"
          />

          <MiniStat
            label="Agotados"
            value={
              loading
                ? "—"
                : String(unavailableProducts)
            }
            icon="⚠️"
          />

          <MiniStat
            label="Categorías"
            value={
              loading
                ? "—"
                : String(totalCategories)
            }
            icon="🗂️"
          />
        </div>

        {/* FILTERS */}

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#111111] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* SEARCH */}

            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                🔎
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar producto..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#181818] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-red-600"
              />
            </div>

            {/* CATEGORY */}

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="h-12 rounded-2xl border border-white/10 bg-[#181818] px-4 text-sm font-bold text-white outline-none focus:border-red-600"
            >
              <option value="all">
                Todas las categorías
              </option>

              {categories.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.emoji
                    ? `${item.emoji} `
                    : ""}
                  {item.name}
                </option>
              ))}
            </select>

            {/* AVAILABLE */}

            <button
              onClick={() =>
                setShowOnlyAvailable(
                  !showOnlyAvailable
                )
              }
              className={`h-12 rounded-2xl border px-4 text-sm font-bold transition ${
                showOnlyAvailable
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-white/10 bg-[#181818] text-neutral-400"
              }`}
            >
              ✓ Disponibles
            </button>
          </div>
        </section>

        {/* PRODUCTS */}

        <section className="mt-7">
          {loading ? (
            <LoadingState />
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map(
                (product) => (
                  <AdminProductCard
                    key={product.id}
                    product={product}
                    categories={categories}
                    onRefresh={loadData}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              search={search}
              category={category}
            />
          )}
        </section>
      </div>
    </main>
  );
}

/* ================================= */
/* PRODUCT CARD */
/* ================================= */

function AdminProductCard({
  product,
  categories,
  onRefresh,
}: {
  product: Product;
  categories: Category[];
  onRefresh: () => void;
}) {
  const [updating, setUpdating] =
    useState(false);

  const category = categories.find(
    (item) =>
      item.id === product.category_id
  );

  async function toggleAvailability() {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from("products")
        .update({
          available: !product.available,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      onRefresh();
    } catch (error) {
      console.error(
        "Error actualizando disponibilidad:",
        error
      );

      alert(
        "No pudimos actualizar la disponibilidad."
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#111111] transition hover:border-white/20">
      {/* IMAGE */}

      <div className="relative h-48 overflow-hidden bg-[#181818]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl opacity-20">
            🍔
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {product.badge && (
          <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[9px] font-black uppercase tracking-wide">
            {product.badge}
          </span>
        )}

        {/* AVAILABLE */}

        <span
          className={`absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide backdrop-blur ${
            product.available
              ? "border-green-500/20 bg-black/70 text-green-400"
              : "border-red-500/20 bg-black/70 text-red-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              product.available
                ? "bg-green-400"
                : "bg-red-400"
            }`}
          />

          {product.available
            ? "Disponible"
            : "Agotado"}
        </span>
      </div>

      {/* CONTENT */}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              {category?.name ??
                "Sin categoría"}
            </p>

            <h3 className="mt-1 text-lg font-black">
              {product.name}
            </h3>
          </div>

          <p className="shrink-0 text-base font-black">
            {formatPrice(product.price)}
          </p>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-5 text-neutral-500">
          {product.description ||
            "Sin descripción."}
        </p>

        {/* FEATURED */}

        {product.featured && (
          <div className="mt-4">
            <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-yellow-400">
              ★ Destacado
            </span>
          </div>
        )}

        {/* ACTIONS */}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="rounded-xl border border-white/10 bg-[#181818] px-3 py-3 text-center text-xs font-black transition hover:border-white/20 hover:bg-[#202020]"
          >
            Editar
          </Link>

          <button
            onClick={toggleAvailability}
            disabled={updating}
            className={`rounded-xl border px-3 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              product.available
                ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }`}
          >
            {updating
              ? "Guardando..."
              : product.available
              ? "Agotado"
              : "Disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================================= */
/* MINI STAT */
/* ================================= */

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg">
          {icon}
        </span>

        <span className="text-xl font-black">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-bold text-neutral-600">
        {label}
      </p>
    </div>
  );
}

/* ================================= */
/* LOADING */
/* ================================= */

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#111111]"
          >
            <div className="h-48 animate-pulse bg-[#181818]" />

            <div className="space-y-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-[#222222]" />

              <div className="h-6 w-40 animate-pulse rounded bg-[#222222]" />

              <div className="h-10 w-full animate-pulse rounded bg-[#181818]" />

              <div className="grid grid-cols-2 gap-2">
                <div className="h-11 animate-pulse rounded-xl bg-[#181818]" />
                <div className="h-11 animate-pulse rounded-xl bg-[#181818]" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ================================= */
/* EMPTY STATE */
/* ================================= */

function EmptyState({
  search,
  category,
}: {
  search: string;
  category: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] px-6 py-20 text-center">
      <div className="text-5xl">
        🔎
      </div>

      <h3 className="mt-5 text-xl font-black">
        No encontramos productos
      </h3>

      <p className="mt-2 text-sm text-neutral-500">
        {search || category !== "all"
          ? "Probá con otro nombre o categoría."
          : "Todavía no hay productos cargados."}
      </p>

      {!search && category === "all" && (
        <Link
          href="/admin/products/new"
          className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-wide transition hover:bg-red-500"
        >
          + Crear producto
        </Link>
      )}
    </div>
  );
}

/* ================================= */
/* FORMAT PRICE */
/* ================================= */

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

