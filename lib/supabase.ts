import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno."
  );
}

/*
 * Cliente público (clave anon). Todo lo que hace está limitado por RLS.
 * Nunca usar acá la service role key.
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
