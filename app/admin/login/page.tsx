"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { storeConfig } from "@/app/data/store";
import { useAdminSession } from "@/lib/admin/session";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const session = useAdminSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Si ya hay sesión con permisos, directo al panel. */
  useEffect(() => {
    if (session.status === "ready") {
      router.replace("/admin");
    }
  }, [session.status, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Completá email y contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      console.error("Error de login:", signInError);

      setError(
        signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : signInError.message === "Email not confirmed"
            ? "Tenés que confirmar tu email antes de ingresar."
            : "No pudimos iniciar sesión. Probá de nuevo."
      );
      return;
    }

    router.replace("/admin");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 text-white">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
            {storeConfig.name}
          </p>

          <h1 className="mt-2 text-3xl font-black">Panel del local</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Ingresá para ver pedidos y editar el menú.
          </p>
        </div>

        {session.status === "forbidden" && (
          <p className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-center text-xs text-yellow-300">
            La cuenta {session.email} no tiene permisos en este local.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-[#111111] p-6"
        >
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-base text-white outline-none focus:border-red-600 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
            >
              Contraseña
            </label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-base text-white outline-none focus:border-red-600 sm:text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-bold text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-xs font-bold text-neutral-500 hover:text-white"
        >
          ← Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
