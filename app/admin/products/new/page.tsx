"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ProductForm from "../_components/ProductForm";

import {
  type AdminCategory,
  EMPTY_PRODUCT,
  createProduct,
  fetchCategories,
} from "@/lib/admin/products";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchCategories().then((result) => {
      if (cancelled) return;
      setLoadError(result === null);
      if (result) setCategories(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <Link href="/admin/products" className="text-sm font-bold text-neutral-500 hover:text-white">
        ← Productos
      </Link>

      <h1 className="mt-3 text-3xl font-black">Nuevo producto</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Después de crearlo vas a poder agregarle opciones, extras e ingredientes.
      </p>

      <div className="mt-6">
        {categories ? (
          <ProductForm
            initialValues={EMPTY_PRODUCT}
            categories={categories}
            submitLabel="Crear producto"
            onSubmit={async (values) => {
              const id = await createProduct(values);

              if (!id) {
                return "No pudimos crear el producto. Probá de nuevo.";
              }

              router.replace(`/admin/products/${id}`);
              return null;
            }}
          />
        ) : (
          <p className="rounded-3xl border border-white/10 bg-[#111111] p-6 text-sm text-neutral-500">
            {loadError ? "No pudimos cargar las categorías." : "Cargando…"}
          </p>
        )}
      </div>
    </div>
  );
}
