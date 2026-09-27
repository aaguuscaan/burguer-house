"use client";

import Image from "next/image";
import { type FormEvent, type ReactNode, useState } from "react";

import {
  type AdminCategory,
  type ProductFormValues,
  uploadProductImage,
  validateProduct,
} from "@/lib/admin/products";
import { isRemoteImage, productImage } from "@/lib/images";

type Props = {
  initialValues: ProductFormValues;
  categories: AdminCategory[];
  submitLabel: string;
  /* Devuelve un mensaje de error para mostrar, o null si salió bien. */
  onSubmit: (values: ProductFormValues) => Promise<string | null>;
  successMessage?: string;
  footer?: ReactNode;
};

export default function ProductForm({
  initialValues,
  categories,
  submitLabel,
  onSubmit,
  successMessage,
  footer,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const errors = validateProduct(values);
  const hasErrors = Object.keys(errors).length > 0;
  const visibleError = (field: keyof typeof errors) =>
    showErrors ? errors[field] : undefined;

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const result = await uploadProductImage(file);

    setUploading(false);

    if (result.ok) {
      set("imageUrl", result.url);
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasErrors) {
      setShowErrors(true);
      return;
    }

    setSaving(true);
    setMessage(null);

    const error = await onSubmit(values);

    setSaving(false);
    setMessage(
      error
        ? { type: "error", text: error }
        : successMessage
          ? { type: "ok", text: successMessage }
          : null
    );
  };

  const preview = productImage(values.imageUrl);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-[#111111] p-5 sm:grid-cols-[180px_1fr] sm:p-6">
        {/* FOTO */}
        <div className="mx-auto w-full max-w-[200px] sm:max-w-none">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#1a1a1a]">
            <Image
              src={preview}
              alt="Foto del producto"
              fill
              sizes="180px"
              unoptimized={isRemoteImage(preview)}
              className="object-cover"
            />

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-black transition hover:border-white/20">
            {uploading ? "Subiendo…" : "Subir foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void handleImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>

          {values.imageUrl && (
            <button
              type="button"
              onClick={() => set("imageUrl", "")}
              className="mt-2 w-full text-center text-[11px] font-bold text-neutral-500 hover:text-red-300"
            >
              Quitar foto
            </button>
          )}
        </div>

        {/* DATOS */}
        <div className="space-y-4">
          <Field label="Nombre" htmlFor="product-name" error={visibleError("name")}>
            <input
              id="product-name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              className={inputClass(visibleError("name"))}
            />
          </Field>

          <Field label="Descripción" htmlFor="product-description">
            <textarea
              id="product-description"
              rows={3}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              className={`${inputClass()} resize-none`}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio base" htmlFor="product-price" error={visibleError("price")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                  $
                </span>
                <input
                  id="product-price"
                  inputMode="numeric"
                  value={values.price}
                  onChange={(event) =>
                    set("price", event.target.value.replace(/[^\d.]/g, ""))
                  }
                  className={`${inputClass(visibleError("price"))} pl-8`}
                />
              </div>
            </Field>

            <Field label="Categoría" htmlFor="product-category" error={visibleError("categoryId")}>
              <select
                id="product-category"
                value={values.categoryId}
                onChange={(event) => set("categoryId", event.target.value)}
                className={inputClass(visibleError("categoryId"))}
              >
                <option value="">Elegí una…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Etiqueta (opcional)" htmlFor="product-badge">
            <input
              id="product-badge"
              value={values.badge}
              maxLength={20}
              placeholder="Ej. NUEVO, MÁS VENDIDO"
              onChange={(event) => set("badge", event.target.value)}
              className={inputClass()}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Toggle
              label="Disponible"
              checked={values.available}
              onChange={(checked) => set("available", checked)}
            />
            <Toggle
              label="Destacado"
              checked={values.featured}
              onChange={(checked) => set("featured", checked)}
            />
          </div>
        </div>
      </section>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-2xl p-4 text-sm font-bold ${
            message.type === "error"
              ? "border border-red-500/20 bg-red-500/10 text-red-300"
              : "border border-green-500/20 bg-green-500/10 text-green-300"
          }`}
        >
          {message.text}
        </p>
      )}

      {showErrors && hasErrors && (
        <p role="alert" className="text-sm font-bold text-red-400">
          Revisá los campos marcados.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-black transition hover:bg-red-500 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {saving ? "Guardando…" : submitLabel}
        </button>

        {footer}
      </div>
    </form>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-2xl border bg-[#161616] px-4 py-3 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 sm:text-sm ${
    error ? "border-red-500/60" : "border-white/10"
  }`;
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-bold text-red-400">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
        checked ? "border-red-600 bg-red-600/10" : "border-white/10 bg-[#161616] text-neutral-400"
      }`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-red-500" : "bg-neutral-700"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
