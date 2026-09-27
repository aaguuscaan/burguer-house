"use client";

import { useEffect, useState } from "react";

import BottomNav from "./components/BottomNav";
import CartButton from "./components/CartButton";
import CategoryCard from "./components/CategoryCard";
import ProductCard from "./components/ProductCard";
import RecentOrderBanner from "./components/RecentOrderBanner";
import SearchBar from "./components/SearchBar";
import { storeConfig } from "./data/store";

import { productImage } from "@/lib/images";
import { scheduleSummary, storeStatus } from "@/lib/schedule";
import { type StoreSettings, useNow, useStoreSettings } from "@/lib/store-settings";
import { supabase } from "@/lib/supabase";
import type { MenuCategory, MenuProduct } from "@/lib/types";

type MenuState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      categories: MenuCategory[];
      products: MenuProduct[];
    };

async function fetchMenu(): Promise<MenuState> {
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, emoji")
      .eq("restaurant_id", storeConfig.restaurantId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, available, badge"
      )
      .eq("restaurant_id", storeConfig.restaurantId)
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesResult.error || productsResult.error) {
    console.error("Error cargando el menú:", {
      categories: categoriesResult.error,
      products: productsResult.error,
    });

    return { status: "error" };
  }

  return {
    status: "ready",

    categories: categoriesResult.data.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.emoji ?? "🍔",
    })),

    products: productsResult.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price),
      image: productImage(product.image_url),
      categoryId: product.category_id,
      badge: product.badge,
      available: product.available ?? true,
    })),
  };
}

export default function Home() {
  const [menu, setMenu] = useState<MenuState>({ status: "loading" });
  const settingsState = useStoreSettings();
  const now = useNow();
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchMenu()
      .catch((error: unknown): MenuState => {
        console.error("Error inesperado cargando el menú:", error);
        return { status: "error" };
      })
      .then((result) => {
        if (!cancelled) {
          setMenu(result);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (menu.status === "loading") {
    return <MenuSkeleton />;
  }

  if (menu.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#111111] p-8 text-center">
          <div className="text-5xl">😕</div>

          <h1 className="mt-5 text-xl font-black">
            No pudimos cargar el menú
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Revisá tu conexión y volvé a intentar.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-red-600 px-6 py-3 text-sm font-black transition hover:bg-red-500 active:scale-95"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const { categories, products } = menu;
  const searchText = search.toLowerCase().trim();

  const filteredProducts = products.filter(
    (product) =>
      product.available &&
      (activeCategory === "all" || product.categoryId === activeCategory) &&
      (product.name.toLowerCase().includes(searchText) ||
        product.description.toLowerCase().includes(searchText))
  );

  const activeCategoryName =
    activeCategory === "all"
      ? "Más pedidos"
      : categories.find((category) => category.id === activeCategory)?.name;

  return (
    <main className="min-h-screen bg-[#090909] pb-44 text-white md:pb-28">
      {/* HEADER */}

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
            {storeConfig.name}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {storeConfig.tagline}
          </p>
        </div>

        {settingsState.status === "ready" && (
          <StatusBadge settings={settingsState.settings} now={now} />
        )}
      </header>

      <div className="px-5 md:px-8">
        <RecentOrderBanner />
      </div>

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
              <span className="text-red-500">Sin vueltas.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-neutral-400 sm:text-base">
              Burgers, pizzas, milanesas, empanadas y mucho más. Pedí lo que
              quieras, como quieras.
            </p>

            <a
              href="#menu"
              className="mt-7 w-fit rounded-full bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95"
            >
              Ver menú
            </a>
          </div>

          <div className="pointer-events-none absolute -bottom-20 -right-8 text-[190px] opacity-20 blur-[1px] sm:text-[260px] md:text-[320px]">
            🍔
          </div>

          <div className="pointer-events-none absolute right-10 top-10 h-32 w-32 rounded-full bg-red-600/10 blur-3xl" />
        </div>
      </section>

      {/* SEARCH */}

      <section className="mx-auto max-w-6xl px-5 pt-6 md:px-8 md:pt-8">
        <SearchBar value={search} onChange={setSearch} />
      </section>

      {/* CATEGORIES */}

      <section className="mx-auto max-w-6xl px-5 pt-8 md:px-8">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
            Explorá
          </p>

          <h2 className="mt-1 text-2xl font-black">Categorías</h2>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryCard
            category={{ id: "all", name: "Todo", icon: "🔥" }}
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />

          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              active={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            />
          ))}
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

            <h2 className="mt-1 text-2xl font-black">{activeCategoryName}</h2>
          </div>

          <span className="text-xs text-neutral-500">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#141414] px-6 py-16 text-center">
            <div className="text-5xl">🔎</div>

            <h3 className="mt-4 text-xl font-black">No encontramos nada</h3>

            <p className="mt-2 text-sm text-neutral-500">
              Probá con otro nombre o categoría.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
              className="mt-5 rounded-full bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-wide"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>

      {/* INFO */}

      <section
        id="info"
        className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-16 md:px-8"
      >
        <div className="rounded-3xl border border-white/10 bg-[#111111] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
            {storeConfig.name}
          </p>

          <h2 className="mt-2 text-2xl font-black">Estamos para vos.</h2>

          {settingsState.status === "ready" && (
            <StoreInfo settings={settingsState.settings} />
          )}
        </div>
      </section>

      <CartButton />
      <BottomNav />
    </main>
  );
}

function MenuSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#090909] px-5 pb-28 pt-5 text-white md:px-8"
      aria-busy="true"
      aria-label="Cargando menú"
    >
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-8 h-[360px] rounded-[2rem] bg-[#141414] md:h-[430px]" />
        <div className="mt-6 h-14 rounded-2xl bg-[#141414]" />

        <div className="mt-8 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-[84px] min-w-[92px] rounded-2xl bg-[#141414]"
            />
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-80 rounded-3xl bg-[#141414]" />
          ))}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ settings, now }: { settings: StoreSettings; now: Date }) {
  const status = storeStatus(
    settings.schedule,
    settings.timezone,
    settings.acceptingOrders,
    now
  );

  return (
    <span
      title={status.label}
      className={`flex max-w-[55%] items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black ${
        status.open
          ? "border-green-500/20 bg-green-500/10 text-green-400"
          : "border-white/10 bg-white/5 text-neutral-400"
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          status.open ? "animate-pulse bg-green-400" : "bg-neutral-500"
        }`}
      />
      <span className="truncate">
        {status.open
          ? status.label
          : status.reason === "paused"
            ? "Pedidos pausados"
            : status.label.replace("Cerrado · ", "")}
      </span>
    </span>
  );
}

function StoreInfo({ settings }: { settings: StoreSettings }) {
  return (
    <div className="mt-6 grid gap-5 text-sm text-neutral-400 sm:grid-cols-2 lg:grid-cols-4">
      {settings.address && (
        <div>
          <p className="font-bold text-white">📍 Dirección</p>
          <p className="mt-1">{settings.address}</p>
        </div>
      )}

      <div>
        <p className="font-bold text-white">🕐 Horarios</p>
        {scheduleSummary(settings.schedule).map((line) => (
          <p key={line} className="mt-1">
            {line}
          </p>
        ))}
      </div>

      <div>
        <p className="font-bold text-white">🛵 Delivery</p>
        <p className="mt-1">
          {settings.deliveryEnabled
            ? `Hasta ${settings.deliveryRadiusKm} km del local`
            : "Solo retiro en el local"}
        </p>
      </div>

      {settings.instagram && (
        <div>
          <p className="font-bold text-white">📸 Instagram</p>
          <a
            href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block hover:text-white"
          >
            {settings.instagram}
          </a>
        </div>
      )}
    </div>
  );
}
