"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [result, setResult] = useState("Probando...");

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from("categories")
        .select("*");

      console.log("SUPABASE CATEGORIES:", data);
      console.log("SUPABASE ERROR:", error);

      if (error) {
        setResult(
          `ERROR: ${error.message} | CODE: ${error.code}`
        );
        return;
      }

      setResult(
        `OK — ${data?.length ?? 0} categorías encontradas`
      );
    }

    test();
  }, []);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="text-2xl font-bold">
        Test Supabase
      </h1>

      <p className="mt-6">
        {result}
      </p>

      <pre className="mt-6 overflow-auto rounded-xl bg-neutral-900 p-4 text-sm">
        Abrí F12 → Console para ver los datos.
      </pre>
    </main>
  );
}