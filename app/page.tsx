"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import CategoryCard from "./components/CategoryCard";
import ProductCard from "./components/ProductCard";
import SearchBar from "./components/SearchBar";
import { supabase } from "@/lib/supabase";

type SupabaseCategory = {
id: string;
name: string;
slug: string;
emoji: string | null;
sort_order: number | null;
active: boolean | null;
};

type SupabaseProduct = {
id: string;
restaurant_id: string;
category_id: string;
name: string;
slug: string;
description: string | null;
price: number;
image_url: string | null;
available: boolean | null;
badge: string | null;
featured: boolean | null;
sort_order: number | null;
};

type Category = {
id: string;
name: string;
icon: string;
};

type Product = {
id: string;
name: string;
description: string;
price: number;
image: string;
category: string;
badge?: string;
featured?: boolean;
available: boolean;
options: never[];
};

const RESTAURANT_ID =
"926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

export default function Home() {
const [categories, setCategories] = useState<Category[]>([]);
const [products, setProducts] = useState<Product[]>([]);

const [activeCategory, setActiveCategory] =
useState("all");

const [search, setSearch] = useState("");

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
async function loadMenu() {
setLoading(true);
setError("");

  try {
    const [
      { data: categoriesData, error: categoriesError },
      { data: productsData, error: productsError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select(
          "id, name, slug, emoji, sort_order, active"
        )
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("active", true)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("products")
        .select(
          "id, restaurant_id, category_id, name, slug, description, price, image_url, available, badge, featured, sort_order"
        )
        .eq("restaurant_id", RESTAURANT_ID)
        .order("sort_order", {
          ascending: true,
        }),
    ]);

    if (categoriesError) {
      console.error(
        "ERROR CATEGORÍAS:",
        categoriesError
      );

      throw new Error(
        "No se pudieron cargar las categorías."
      );
    }

    if (productsError) {
      console.error(
        "ERROR PRODUCTOS:",
        productsError
      );

      throw new Error(
        "No se pudieron cargar los productos."
      );
    }

    const formattedCategories: Category[] = (
      categoriesData ?? []
    ).map(
      (category: SupabaseCategory) => ({
        id: category.id,
        name: category.name,
        icon: category.emoji ?? "🍔",
      })
    );

    const formattedProducts: Product[] = (
      productsData ?? []
    ).map(
      (product: SupabaseProduct) => ({
        id: product.id,
        name: product.name,
        description:
          product.description ?? "",
        price: Number(product.price),
        image:
          product.image_url ??
          "/images/products/placeholder.jpg",
        category: product.category_id,
        badge:
          product.badge ?? undefined,
        featured:
          product.featured ?? false,
        available:
          product.available ?? true,
        options: [],
      })
    );

    setCategories(formattedCategories);
    setProducts(formattedProducts);
  } catch (err) {
    console.error(
      "ERROR CARGANDO MENÚ:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "No se pudo cargar el menú."
    );
  } finally {
    setLoading(false);
  }
}

loadMenu();

}, []);

const filteredProducts = useMemo(() => {
const searchText = search
.toLowerCase()
.trim();

return products.filter((product) => {
  const matchesCategory =
    activeCategory === "all" ||
    product.category === activeCategory;

  const matchesSearch =
    product.name
      .toLowerCase()
      .includes(searchText) ||
    product.description
      .toLowerCase()
      .includes(searchText);

  return (
    matchesCategory &&
    matchesSearch &&
    product.available
  );
});

}, [
products,
activeCategory,
search,
]);

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
<div className="text-center">
<div className="text-5xl">
🍔
</div>

      <p className="mt-4 text-sm font-bold text-neutral-500">
        Cargando menú...
      </p>
    </div>
  </main>
);

}

if (error) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 text-white">
<div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#111111] p-8 text-center">
<div className="text-5xl">
😕
</div>

      <h1 className="mt-5 text-xl font-black">
        No pudimos cargar el menú
      </h1>

      <p className="mt-2 text-sm text-neutral-500">
        {error}
      </p>

      <button
        onClick={() =>
          window.location.reload()
        }
        className="mt-6 rounded-full bg-red-600 px-6 py-3 text-sm font-black"
      >
        Reintentar
      </button>
    </div>
  </main>
);

}

return (
<main className="min-h-screen bg-[#090909] pb-28 text-white">
{/* HEADER */}

  <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
        Burger House
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        Comida real. Sin vueltas.
      </p>
    </div>

    <button
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-lg transition hover:bg-[#202020]"
      aria-label="Favoritos"
    >
      ♡
    </button>
  </header>

  {/* HERO */}

  <section className="mx-auto max-w-6xl px-5 pt-8 md:px-8 md:pt-16">
    <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#241010] via-[#151010] to-[#0f0f0f] p-7 sm:p-10 md:min-h-[430px] md:p-14">
      <div className="relative z-10 flex h-full max-w-xl flex-col justify-center">
        <span className="inline-flex w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-400">
          Pedí online
        </span>

        <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
          Comida real.
          <br />
          <span className="text-red-500">
            Sin vueltas.
          </span>
        </h1>

        <p className="mt-5 max-w-md text-sm leading-6 text-neutral-400 sm:text-base">
          Burgers, pizzas, milanesas,
          empanadas y mucho más.
          Pedí lo que quieras, como
          quieras.
        </p>

        <button
          onClick={() => {
            document
              .getElementById("menu")
              ?.scrollIntoView({
                behavior: "smooth",
              });
          }}
          className="mt-7 w-fit rounded-full bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95"
        >
          Ver menú
        </button>
      </div>

      <div className="pointer-events-none absolute -bottom-20 -right-8 text-[190px] opacity-20 blur-[1px] sm:text-[260px] md:text-[320px]">
        🍔
      </div>

      <div className="pointer-events-none absolute right-10 top-10 h-32 w-32 rounded-full bg-red-600/10 blur-3xl" />
    </div>
  </section>

  {/* SEARCH */}

  <section className="mx-auto max-w-6xl px-5 pt-6 md:px-8 md:pt-8">
    <SearchBar
      value={search}
      onChange={setSearch}
    />
  </section>

  {/* CATEGORIES */}

  <section className="mx-auto max-w-6xl px-5 pt-8 md:px-8">
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
        Explorá
      </p>

      <h2 className="mt-1 text-2xl font-black">
        Categorías
      </h2>
    </div>

    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        onClick={() =>
          setActiveCategory("all")
        }
        className={`flex min-w-[92px] flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition active:scale-95 ${
          activeCategory === "all"
            ? "border-red-600 bg-red-600 text-white"
            : "border-white/10 bg-[#141414] text-neutral-300 hover:border-white/20"
        }`}
      >
        <span className="text-2xl">
          🔥
        </span>

        <span className="text-xs font-bold">
          Todo
        </span>
      </button>

      {categories.map(
        (category) => (
          <CategoryCard
            key={category.id}
            category={category}
            active={
              activeCategory ===
              category.id
            }
            onClick={() =>
              setActiveCategory(
                category.id
              )
            }
          />
        )
      )}
    </div>
  </section>

  {/* PRODUCTS */}

  <section
    id="menu"
    className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-10 md:px-8"
  >
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
          Nuestros favoritos
        </p>

        <h2 className="mt-1 text-2xl font-black">
          {activeCategory === "all"
            ? "Más pedidos"
            : categories.find(
                (category) =>
                  category.id ===
                  activeCategory
              )?.name}
        </h2>
      </div>

      <span className="text-xs text-neutral-500">
        {filteredProducts.length}{" "}
        productos
      </span>
    </div>

    {filteredProducts.length >
    0 ? (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map(
          (product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          )
        )}
      </div>
    ) : (
      <div className="rounded-3xl border border-white/10 bg-[#141414] px-6 py-16 text-center">
        <div className="text-5xl">
          🔎
        </div>

        <h3 className="mt-4 text-xl font-black">
          No encontramos nada
        </h3>

        <p className="mt-2 text-sm text-neutral-500">
          Probá con otro nombre o
          categoría.
        </p>

        <button
          onClick={() => {
            setSearch("");
            setActiveCategory(
              "all"
            );
          }}
          className="mt-5 rounded-full bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-wide"
        >
          Limpiar búsqueda
        </button>
      </div>
    )}
  </section>

  {/* INFO */}

  <section className="mx-auto max-w-6xl px-5 pt-16 md:px-8">
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-8">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
        Burger House
      </p>

      <h2 className="mt-2 text-2xl font-black">
        Estamos para vos.
      </h2>

      <div className="mt-6 grid gap-5 text-sm text-neutral-400 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-bold text-white">
            📍 Dirección
          </p>

          <p className="mt-1">
            Av. Siempre Viva 1234
          </p>
        </div>

        <div>
          <p className="font-bold text-white">
            🕐 Horarios
          </p>

          <p className="mt-1">
            Todos los días
          </p>
        </div>

        <div>
          <p className="font-bold text-white">
            📱 WhatsApp
          </p>

          <p className="mt-1">
            Hacé tu pedido online
          </p>
        </div>

        <div>
          <p className="font-bold text-white">
            📸 Instagram
          </p>

          <p className="mt-1">
            @burgerhouse
          </p>
        </div>
      </div>
    </div>
  </section>

  <BottomNav />
</main>

);
}