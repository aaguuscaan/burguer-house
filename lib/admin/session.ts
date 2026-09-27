"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { storeConfig } from "@/app/data/store";
import { supabase } from "@/lib/supabase";

export type AdminSession =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden"; email: string }
  | { status: "ready"; email: string; role: string };

/*
 * Sesión del panel: usuario logueado + que figure en restaurant_users
 * para este restaurante. La seguridad real la hace RLS en la base; esto
 * solo decide qué pantalla mostrar.
 */
export function useAdminSession(): AdminSession {
  const [session, setSession] = useState<AdminSession>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function resolve(authSession: Session | null) {
      if (!authSession) {
        if (!cancelled) setSession({ status: "signed-out" });
        return;
      }

      const email = authSession.user.email ?? "";

      const { data, error } = await supabase
        .from("restaurant_users")
        .select("role")
        .eq("restaurant_id", storeConfig.restaurantId)
        .eq("user_id", authSession.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error verificando permisos del admin:", error);
      }

      setSession(
        data
          ? { status: "ready", email, role: data.role }
          : { status: "forbidden", email }
      );
    }

    /*
     * Supabase recomienda no hacer consultas dentro del callback de
     * onAuthStateChange: se difieren con setTimeout.
     */
    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setTimeout(() => {
        void resolve(authSession);
      }, 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error cerrando sesión:", error);
  }
}
