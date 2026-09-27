"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { storeConfig } from "@/app/data/store";
import { signOut, useAdminSession } from "@/lib/admin/session";

/*
 * Envuelve todo /admin:
 *  - /admin/login se muestra siempre;
 *  - el resto exige sesión + permiso de staff.
 */
export default function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <AdminGate>{children}</AdminGate>;
}

function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useAdminSession();

  useEffect(() => {
    if (session.status === "signed-out") {
      router.replace("/admin/login");
    }
  }, [session.status, router]);

  if (session.status === "loading" || session.status === "signed-out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <div className="flex items-center gap-3 text-sm font-bold text-neutral-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
          Verificando acceso…
        </div>
      </main>
    );
  }

  if (session.status === "forbidden") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111111] p-8 text-center">
          <p className="text-4xl">🔒</p>

          <h1 className="mt-4 text-xl font-black">Sin acceso al panel</h1>

          <p className="mt-2 text-sm text-neutral-500">
            La cuenta {session.email} no tiene permisos en {storeConfig.name}.
          </p>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  return <AdminShell email={session.email}>{children}</AdminShell>;
}

const NAVIGATION = [
  { href: "/admin", label: "Pedidos", icon: "📦" },
  { href: "/admin/products", label: "Productos", icon: "🍔" },
];

function AdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const navigation = (
    <nav className="space-y-1">
      {NAVIGATION.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
            isActive(item.href)
              ? "bg-red-600 text-white"
              : "text-neutral-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}

      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-neutral-400 transition hover:bg-white/5 hover:text-white"
      >
        <span>↗</span>
        <span>Ver tienda</span>
      </Link>
    </nav>
  );

  const account = (
    <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
      <p className="truncate text-xs text-neutral-500">{email}</p>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-2 text-xs font-black uppercase tracking-wide text-red-500 hover:text-red-400"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      {/* Mobile */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#090909]/95 px-5 backdrop-blur-xl lg:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
            {storeConfig.name}
          </p>
          <p className="text-sm font-bold">Administración</p>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#141414] text-xl"
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 space-y-4 border-b border-white/10 bg-[#101010] p-4 lg:hidden">
          {navigation}
          {account}
        </div>
      )}

      <div className="flex">
        {/* Desktop */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0d0d0d] lg:flex">
          <div className="border-b border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
              {storeConfig.name}
            </p>
            <p className="mt-1 text-lg font-black">Administración</p>
          </div>

          <div className="flex-1 p-4">{navigation}</div>

          <div className="p-4">{account}</div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
