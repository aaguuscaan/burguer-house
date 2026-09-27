"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

type OrderStatus =
  | "NUEVO"
  | "CONFIRMADO"
  | "PREPARANDO"
  | "LISTO"
  | "CANCELADO";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_adress: string | null;
  order_type: string;
  payment_method: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
};

const RESTAURANT_ID =
  "926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);

export default function AdminPage() {
  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    const { data, error } =
      await supabase
        .from("orders")
        .select("*")
        .eq(
          "restaurant_id",
          RESTAURANT_ID
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

    if (error) {
      console.error(error);

      setError(
        "No se pudieron cargar los pedidos."
      );

      setLoading(false);
      return;
    }

    setOrders(
      (data ?? []) as Order[]
    );

    setLoading(false);
  };

  useEffect(() => {
    loadOrders();

    /*
     * Actualización automática cuando
     * entra un pedido nuevo.
     */
    const channel =
      supabase
        .channel("orders-admin")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${RESTAURANT_ID}`,
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const todayOrders =
    orders.filter(
      (order) =>
        order.created_at.startsWith(
          today
        )
    );

  const todaySales =
    todayOrders.reduce(
      (total, order) =>
        total + Number(order.total),
      0
    );

  const averageTicket =
    todayOrders.length > 0
      ? todaySales /
        todayOrders.length
      : 0;

  const activeOrders =
    orders.filter(
      (order) =>
        order.status !==
          "LISTO" &&
        order.status !==
          "CANCELADO"
    );

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#090909]/95 px-5 backdrop-blur-xl lg:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
            Burger House
          </p>

          <p className="text-sm font-bold">
            Administración
          </p>
        </div>

        <button
          onClick={() =>
            setMobileMenu(!mobileMenu)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#141414] text-xl"
        >
          {mobileMenu ? "×" : "☰"}
        </button>
      </header>

      {mobileMenu && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-[#101010] p-4 lg:hidden">
          <AdminNavigation
            activeSection={
              activeSection
            }
            setActiveSection={(
              section
            ) => {
              setActiveSection(
                section
              );
              setMobileMenu(false);
            }}
          />
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0d0d] lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
              Burger House
            </p>

            <h1 className="mt-1 text-lg font-black">
              Admin Panel
            </h1>
          </div>

          <div className="flex-1 p-4">
            <AdminNavigation
              activeSection={
                activeSection
              }
              setActiveSection={
                setActiveSection
              }
            />
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-black">
                  B
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Burger House
                  </p>

                  <p className="text-xs text-neutral-500">
                    Restaurante
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl p-5 sm:p-7 lg:p-10">
            <div className="hidden items-center justify-between lg:flex">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                  Panel de control
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  Buenas noches 👋
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Acá tenés el resumen de tu
                  restaurante.
                </p>
              </div>

              <Link
                href="/"
                className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm font-bold transition hover:border-white/20"
              >
                Ver tienda →
              </Link>
            </div>

            <div className="lg:hidden">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                Panel de control
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Resumen
              </h2>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              <StatCard
                title="Ventas de hoy"
                value={formatPrice(
                  todaySales
                )}
                change="Hoy"
                icon="💰"
              />

              <StatCard
                title="Pedidos de hoy"
                value={String(
                  todayOrders.length
                )}
                change={`${activeOrders.length} activos`}
                icon="🛒"
              />

              <StatCard
                title="Ticket promedio"
                value={formatPrice(
                  averageTicket
                )}
                change="Hoy"
                icon="📈"
              />

              <StatCard
                title="Pedidos activos"
                value={String(
                  activeOrders.length
                )}
                change="En curso"
                icon="🍔"
              />
            </div>

            <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_360px]">
              <section className="rounded-3xl border border-white/10 bg-[#111111]">
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                      Actividad
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      Pedidos recientes
                    </h3>
                  </div>

                  <button
                    onClick={() =>
                      loadOrders()
                    }
                    className="text-xs font-black uppercase tracking-wide text-red-500"
                  >
                    Actualizar
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-sm text-neutral-500">
                    Cargando pedidos...
                  </div>
                ) : orders.length ===
                  0 ? (
                  <div className="p-8 text-center">
                    <p className="text-3xl">
                      📦
                    </p>

                    <p className="mt-3 text-sm font-bold">
                      Todavía no hay pedidos
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Los nuevos pedidos
                      aparecerán acá.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {orders
                      .slice(0, 10)
                      .map(
                        (order) => (
                          <OrderRow
                            key={
                              order.id
                            }
                            order={
                              order
                            }
                          />
                        )
                      )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#111111] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                  Accesos rápidos
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Administrar
                </h3>

                <div className="mt-5 space-y-3">
                  <QuickAction
                    icon="🍔"
                    title="Productos"
                    description="Editar menú y precios"
                    onClick={() =>
                      setActiveSection(
                        "products"
                      )
                    }
                  />

                  <QuickAction
                    icon="📦"
                    title="Pedidos"
                    description="Ver pedidos activos"
                    onClick={() =>
                      setActiveSection(
                        "orders"
                      )
                    }
                  />

                  <QuickAction
                    icon="🏷️"
                    title="Promociones"
                    description="Crear descuentos"
                    onClick={() =>
                      setActiveSection(
                        "promotions"
                      )
                    }
                  />

                  <QuickAction
                    icon="⚙️"
                    title="Configuración"
                    description="Personalizar restaurante"
                    onClick={() =>
                      setActiveSection(
                        "settings"
                      )
                    }
                  />
                </div>
              </section>
            </div>

            <section className="mt-5 rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                    Base de datos
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Estado del sistema
                  </h3>
                </div>

                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-400">
                  CONECTADO
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoBox
                  title="Pedidos"
                  value={String(
                    orders.length
                  )}
                />

                <InfoBox
                  title="Activos"
                  value={String(
                    activeOrders.length
                  )}
                />

                <InfoBox
                  title="Ventas hoy"
                  value={formatPrice(
                    todaySales
                  )}
                />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminNavigation({
  activeSection,
  setActiveSection,
}: {
  activeSection: string;
  setActiveSection: (
    section: string
  ) => void;
}) {
  const navigation = [
    {
      id: "dashboard",
      label: "Inicio",
      icon: "📊",
    },
    {
      id: "orders",
      label: "Pedidos",
      icon: "📦",
    },
    {
      id: "products",
      label: "Productos",
      icon: "🍔",
    },
    {
      id: "categories",
      label: "Categorías",
      icon: "🗂️",
    },
    {
      id: "promotions",
      label: "Promociones",
      icon: "🏷️",
    },
    {
      id: "settings",
      label: "Configuración",
      icon: "⚙️",
    },
  ];

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const active =
          activeSection === item.id;

        return (
          <button
            key={item.id}
            onClick={() =>
              setActiveSection(
                item.id
              )
            }
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
              active
                ? "bg-red-600 text-white"
                : "text-neutral-500 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <span className="text-xl">
          {icon}
        </span>

        <span className="text-[10px] font-black text-green-500">
          {change}
        </span>
      </div>

      <p className="mt-5 text-xs font-bold text-neutral-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-black sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function OrderRow({
  order,
}: {
  order: Order;
}) {
  const statusClasses = {
    NUEVO:
      "bg-red-500/10 text-red-400",
    CONFIRMADO:
      "bg-blue-500/10 text-blue-400",
    PREPARANDO:
      "bg-yellow-500/10 text-yellow-400",
    LISTO:
      "bg-green-500/10 text-green-400",
    CANCELADO:
      "bg-neutral-500/10 text-neutral-400",
  };

  const date = new Date(
    order.created_at
  );

  const time =
    date.toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return (
    <div className="flex items-center gap-3 p-4 sm:gap-5 sm:p-5">
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b1b1b] text-lg sm:flex">
        {order.order_type
          .toLowerCase()
          .includes("delivery")
          ? "🛵"
          : "🏪"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black">
            #{order.order_number}
          </p>

          <span className="text-[10px] text-neutral-600">
            {time}
          </span>
        </div>

        <p className="mt-1 truncate text-xs text-neutral-500">
          {order.customer_name} ·{" "}
          {order.order_type}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-black">
          {formatPrice(
            Number(order.total)
          )}
        </p>

        <span
          className={`mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-black ${
            statusClasses[
              order.status
            ] ??
            "bg-neutral-500/10 text-neutral-400"
          }`}
        >
          {order.status}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-[#151515] p-4 text-left transition hover:border-white/20 hover:bg-[#191919] active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-lg">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">
          {title}
        </p>

        <p className="mt-1 text-xs text-neutral-600">
          {description}
        </p>
      </div>

      <span className="text-neutral-600">
        →
      </span>
    </button>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
      <p className="text-xs font-bold text-neutral-500">
        {title}
      </p>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>
    </div>
  );
}