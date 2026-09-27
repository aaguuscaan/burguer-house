"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  type AdminCategory,
  type AdminProductSummary,
  fetchCategories,
  fetchProductSummaries,
  setProductAvailable,
} from "@/lib/admin/products";
import { formatPrice } from "@/lib/format";
import { isRemoteImage, productImage } from "@/lib/images";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      products: AdminProductSummary[];
      categories: AdminCategory[];
    };

async function loadAll(): Promise<LoadState> {
  const [products, categories] = await Promise.all([
    fetchProductSummaries(),
    fetchCategories(),
  ]);

  return products && categories
    ? { status: "ready", products, categories }
    : { status: "error" };
}

export default function AdminProductsPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAll().then((result) => {
      if (!cancelled) setState(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status !== "ready") {
    return (
      <div className="p-5 sm:p-8">
        {state.status === "error" ? (
          <p className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center font-black text-red-300">
            No pudimos cargar los productos.
          </p>
        ) : (
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 rounded-lg bg-white/10" />
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-[#141414]" />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { products, categories } = state;

  const toggleAvailable = async (product: AdminProductSummary) => {
    setError(null);

    const update = (available: boolean) =>
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              products: current.products.map((item) =>
                item.id === product.id ? { ...item, available } : item
              ),
            }
          : current
      );

    update(!product.available);

    const ok = await setProductAvailable(product.id, !product.available);

    if (!ok) {
      update(product.available);
      setError(`No pudimos actualizar “${product.name}”.`);
    }
  };

  const searchText = search.trim().toLowerCase();

  const sections = [
    ...categories.map((category) => ({
      id: category.id,
      title: `${category.emoji ?? ""} ${category.name}`.trim(),
    })),
    { id: "none", title: "Sin categoría" },
  ]
    .filter((section) => categoryFilter === "all" || section.id === categoryFilter)
    .map((section) => ({
      ...section,
      products: products.filter(
        (product) =>
          (product.categoryId ?? "none") === section.id &&
          product.name.toLowerCase().includes(searchText)
      ),
    }))
    .filter((section) => section.products.length > 0);

  const unavailableCount = products.filter((product) => !product.available).length;

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            Menú
          </p>
          <h1 className="mt-1 text-3xl font-black">Productos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {products.length} productos
            {unavailableCount > 0 && ` · ${unavailableCount} pausados`}
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-500 active:scale-95"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          className="h-12 flex-1 rounded-2xl border border-white/10 bg-[#141414] px-4 text-base outline-none focus:border-red-600 sm:text-sm"
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filtrar por categoría"
          className="h-12 rounded-2xl border border-white/10 bg-[#141414] px-4 text-sm outline-none focus:border-red-600"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {error}
        </p>
      )}

      {sections.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-[#111111] px-6 py-14 text-center">
          <p className="text-4xl">🔎</p>
          <p className="mt-3 font-black">No encontramos productos</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-neutral-500">
                {section.title}
              </h2>

              <ul className="divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-[#111111]">
                {section.products.map((product) => {
                  const image = productImage(product.imageUrl);

                  return (
                    <li key={product.id} className="flex items-center gap-4 p-3 sm:p-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#1a1a1a]">
                          <Image
                            src={image}
                            alt=""
                            fill
                            sizes="56px"
                            unoptimized={isRemoteImage(image)}
                            className={`object-cover ${product.available ? "" : "opacity-40 grayscale"}`}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black">
                            {product.name}
                            {product.badge && (
                              <span className="ml-2 rounded-full bg-red-600/15 px-2 py-0.5 align-middle text-[9px] font-black text-red-300">
                                {product.badge}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-neutral-400">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={product.available}
                        aria-label={`${product.name}: ${product.available ? "disponible" : "pausado"}`}
                        onClick={() => void toggleAvailable(product)}
                        className="flex shrink-0 items-center gap-2 text-xs font-bold"
                      >
                        <span className={`hidden sm:inline ${product.available ? "text-green-400" : "text-neutral-500"}`}>
                          {product.available ? "Disponible" : "Pausado"}
                        </span>
                        <span
                          className={`relative h-7 w-12 rounded-full transition ${
                            product.available ? "bg-green-500" : "bg-neutral-700"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                              product.available ? "left-6" : "left-1"
                            }`}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
