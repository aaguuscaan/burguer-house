"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OptionsEditor from "../_components/OptionsEditor";
import ProductForm from "../_components/ProductForm";

import {
  type AdminCategory,
  type ProductFormValues,
  deleteProduct,
  fetchCategories,
  fetchProductForm,
  updateProduct,
} from "@/lib/admin/products";

type LoadState =
  | { productId: string; status: "error" | "not-found" }
  | {
      productId: string;
      status: "ready";
      values: ProductFormValues;
      categories: AdminCategory[];
    };

async function load(productId: string): Promise<LoadState> {
  const [values, categories] = await Promise.all([
    fetchProductForm(productId),
    fetchCategories(),
  ]);

  if (values === "not-found") return { productId, status: "not-found" };
  if (!values || !categories) return { productId, status: "error" };

  return { productId, status: "ready", values, categories };
}

export default function EditProductPage() {
  const { id: productId } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<LoadState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    load(productId).then((result) => {
      if (!cancelled) setState(result);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleDelete = async () => {
    setDeleteError(null);

    if (await deleteProduct(productId)) {
      router.replace("/admin/products");
    } else {
      setDeleteError("No pudimos borrar el producto.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <Link href="/admin/products" className="text-sm font-bold text-neutral-500 hover:text-white">
        ← Productos
      </Link>

      {!state || state.productId !== productId ? (
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-white/10" />
          <div className="h-80 rounded-3xl bg-[#141414]" />
        </div>
      ) : state.status !== "ready" ? (
        <p className="mt-6 rounded-3xl border border-white/10 bg-[#111111] p-6 text-sm text-neutral-400">
          {state.status === "not-found"
            ? "Este producto no existe o fue borrado."
            : "No pudimos cargar el producto."}
        </p>
      ) : (
        <>
          <h1 className="mt-3 text-3xl font-black">{state.values.name}</h1>

          <div className="mt-6">
            <ProductForm
              key={productId}
              initialValues={state.values}
              categories={state.categories}
              submitLabel="Guardar cambios"
              successMessage="Cambios guardados ✓"
              onSubmit={async (values) =>
                (await updateProduct(productId, values))
                  ? null
                  : "No pudimos guardar los cambios. Probá de nuevo."
              }
              footer={
                <Link
                  href={`/product/${productId}`}
                  target="_blank"
                  className="text-sm font-bold text-neutral-500 hover:text-white"
                >
                  Ver en la tienda ↗
                </Link>
              }
            />
          </div>

          <div className="mt-8">
            <OptionsEditor productId={productId} />
          </div>

          <section className="mt-8 rounded-3xl border border-red-500/20 p-5 sm:p-6">
            <h2 className="font-black text-red-300">Borrar producto</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Se borra del menú junto con sus opciones. Los pedidos anteriores no se
              modifican. Si solo querés ocultarlo, desactivá “Disponible”.
            </p>

            {deleteError && (
              <p role="alert" className="mt-3 text-sm font-bold text-red-300">
                {deleteError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black"
                  >
                    Sí, borrar definitivamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-neutral-400"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10"
                >
                  Borrar producto
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
