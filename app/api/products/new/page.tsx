"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type OptionItem = {
  id: string;
  name: string;
  price: number;
};

type OptionGroup = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  options: OptionItem[];
};

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewProductPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [available, setAvailable] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [optionGroups, setOptionGroups] =
    useState<OptionGroup[]>([]);

  /*
   * ID DEL RESTAURANTE
   *
   * Este es el Burger House que ya tenés creado
   * en Supabase.
   */
  const RESTAURANT_ID =
    "926cd9b7-7fa2-4664-8cd8-c65e80ea1956";

  /*
   * CARGAR CATEGORÍAS DESDE SUPABASE
   */
  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      setError("");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("restaurant_id", RESTAURANT_ID)
        .eq("active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Error cargando categorías:",
          error
        );

        setError(
          "No se pudieron cargar las categorías."
        );

        setLoadingCategories(false);
        return;
      }

      setCategories(data ?? []);

      if (data && data.length > 0) {
        setCategory(data[0].id);
      }

      setLoadingCategories(false);
    }

    loadCategories();
  }, []);

  /*
   * AGREGAR GRUPO DE OPCIONES
   */
  const addOptionGroup = () => {
    setOptionGroups((current) => [
      ...current,
      {
        id: createId(),
        name: "Nueva personalización",
        type: "radio",
        required: false,
        options: [],
      },
    ]);
  };

  /*
   * ACTUALIZAR GRUPO
   */
  const updateOptionGroup = (
    groupId: string,
    changes: Partial<OptionGroup>
  ) => {
    setOptionGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              ...changes,
            }
          : group
      )
    );
  };

  /*
   * ELIMINAR GRUPO
   */
  const deleteOptionGroup = (
    groupId: string
  ) => {
    setOptionGroups((current) =>
      current.filter(
        (group) => group.id !== groupId
      )
    );
  };

  /*
   * AGREGAR OPCIÓN
   */
  const addOption = (groupId: string) => {
    setOptionGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: [
                ...group.options,
                {
                  id: createId(),
                  name: "Nueva opción",
                  price: 0,
                },
              ],
            }
          : group
      )
    );
  };

  /*
   * ACTUALIZAR OPCIÓN
   */
  const updateOption = (
    groupId: string,
    optionId: string,
    changes: Partial<OptionItem>
  ) => {
    setOptionGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map(
                (option) =>
                  option.id === optionId
                    ? {
                        ...option,
                        ...changes,
                      }
                    : option
              ),
            }
          : group
      )
    );
  };

  /*
   * ELIMINAR OPCIÓN
   */
  const deleteOption = (
    groupId: string,
    optionId: string
  ) => {
    setOptionGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.filter(
                (option) =>
                  option.id !== optionId
              ),
            }
          : group
      )
    );
  };

  /*
   * GUARDAR PRODUCTO EN SUPABASE
   */
  const handleSave = async () => {
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError(
        "Ingresá el nombre del producto."
      );
      return;
    }

    if (!price || Number(price) <= 0) {
      setError("Ingresá un precio válido.");
      return;
    }

    if (!category) {
      setError(
        "Seleccioná una categoría."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Creamos un slug a partir del nombre
       */
      const slugBase = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const slug = `${slugBase}-${Date.now()}`;

      /*
       * INSERTAR PRODUCTO
       */
      const { data, error } = await supabase
        .from("products")
        .insert({
          restaurant_id: RESTAURANT_ID,
          category_id: category,
          name: name.trim(),
          slug,
          description: description.trim() || null,
          price: Number(price),
          image_url: image.trim() || null,
          available,
          badge: null,
          featured: false,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Error guardando producto:",
          error
        );

        setError(
          `No se pudo guardar el producto: ${error.message}`
        );

        return;
      }

      console.log(
        "Producto creado:",
        data
      );

      setSaved(true);

      /*
       * Limpiamos el formulario
       */
      setName("");
      setDescription("");
      setPrice("");
      setImage("");
      setAvailable(true);
      setOptionGroups([]);

      if (categories.length > 0) {
        setCategory(categories[0].id);
      }
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error inesperado."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * CATEGORÍA ACTUAL
   */
  const selectedCategory = useMemo(
    () =>
      categories.find(
        (item) => item.id === category
      ),
    [categories, category]
  );

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-7 lg:min-h-20 lg:px-10">
          <div>
            <Link
              href="/admin/products"
              className="text-xs font-black uppercase tracking-[0.25em] text-red-500"
            >
              Productos
            </Link>

            <h1 className="mt-1 text-lg font-black sm:text-xl">
              Nuevo producto
            </h1>
          </div>

          <Link
            href="/admin/products"
            className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-xs font-bold text-neutral-300 transition hover:border-white/20"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5 sm:p-7 lg:p-10">

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="font-black text-red-400">
              Error
            </p>

            <p className="mt-1 text-sm text-red-400/80">
              {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}

        {saved && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <span className="text-xl">
              ✓
            </span>

            <div>
              <p className="font-black text-green-400">
                Producto creado correctamente
              </p>

              <p className="mt-1 text-sm text-green-400/70">
                El producto ya fue guardado en
                Supabase.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[1fr_380px]">

          {/* LEFT */}

          <div className="space-y-7">

            {/* BASIC INFO */}

            <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7">

              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                  Información
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Datos del producto
                </h2>
              </div>

              <div className="space-y-5">

                {/* NAME */}

                <Field
                  label="Nombre"
                  required
                >
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Ej: Doble Bacon"
                    className="input"
                  />
                </Field>

                {/* DESCRIPTION */}

                <Field label="Descripción">
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describí el producto..."
                    rows={4}
                    className="input resize-none"
                  />
                </Field>

                {/* PRICE + CATEGORY */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    label="Precio"
                    required
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        $
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={price}
                        onChange={(event) =>
                          setPrice(
                            event.target.value
                          )
                        }
                        placeholder="12500"
                        className="input pl-9"
                      />
                    </div>
                  </Field>

                  <Field
                    label="Categoría"
                    required
                  >
                    <select
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value
                        )
                      }
                      disabled={
                        loadingCategories
                      }
                      className="input"
                    >
                      {loadingCategories ? (
                        <option>
                          Cargando categorías...
                        </option>
                      ) : (
                        <>
                          {categories.map(
                            (item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.name}
                              </option>
                            )
                          )}
                        </>
                      )}
                    </select>
                  </Field>

                </div>

                {/* IMAGE */}

                <Field label="Imagen">
                  <input
                    value={image}
                    onChange={(event) =>
                      setImage(
                        event.target.value
                      )
                    }
                    placeholder="/images/products/mi-producto.jpg"
                    className="input"
                  />

                  <p className="mt-2 text-xs text-neutral-600">
                    Por ahora ingresá la ruta de
                    la imagen.
                  </p>
                </Field>

                {/* AVAILABILITY */}

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#181818] p-4">

                  <div>
                    <p className="text-sm font-bold">
                      Producto disponible
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Si está desactivado, no
                      aparecerá como disponible.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAvailable(
                        !available
                      )
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      available
                        ? "bg-green-500"
                        : "bg-neutral-700"
                    }`}
                    aria-label="Cambiar disponibilidad"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        available
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>

                </div>

              </div>
            </section>

            {/* CUSTOMIZATION */}

            <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
                    Personalización
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Opciones del producto
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                    Creá opciones que el cliente
                    pueda elegir antes de agregar
                    el producto al carrito.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addOptionGroup}
                  className="rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-95"
                >
                  + Agregar grupo
                </button>

              </div>

              {optionGroups.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-[#151515] px-6 py-12 text-center">

                  <div className="text-4xl">
                    ⚙️
                  </div>

                  <h3 className="mt-4 font-black">
                    Sin personalizaciones
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-neutral-600">
                    Este producto no tiene
                    opciones todavía.
                  </p>

                  <button
                    type="button"
                    onClick={addOptionGroup}
                    className="mt-5 rounded-xl border border-white/10 bg-[#202020] px-4 py-3 text-xs font-black transition hover:bg-[#282828]"
                  >
                    Crear primera opción
                  </button>

                </div>
              ) : (
                <div className="mt-6 space-y-5">

                  {optionGroups.map(
                    (
                      group,
                      groupIndex
                    ) => (
                      <OptionGroupEditor
                        key={group.id}
                        group={group}
                        index={
                          groupIndex + 1
                        }
                        onUpdate={(
                          changes
                        ) =>
                          updateOptionGroup(
                            group.id,
                            changes
                          )
                        }
                        onDelete={() =>
                          deleteOptionGroup(
                            group.id
                          )
                        }
                        onAddOption={() =>
                          addOption(
                            group.id
                          )
                        }
                        onUpdateOption={(
                          optionId,
                          changes
                        ) =>
                          updateOption(
                            group.id,
                            optionId,
                            changes
                          )
                        }
                        onDeleteOption={(
                          optionId
                        ) =>
                          deleteOption(
                            group.id,
                            optionId
                          )
                        }
                      />
                    )
                  )}

                </div>
              )}

            </section>

            {/* SAVE */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <Link
                href="/admin/products"
                className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-4 text-center text-sm font-black transition hover:bg-[#1c1c1c]"
              >
                Cancelar
              </Link>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-red-600 px-7 py-4 text-sm font-black uppercase tracking-wide transition hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar producto"}
              </button>

            </div>

          </div>

          {/* PREVIEW */}

          <aside className="lg:sticky lg:top-28 lg:self-start">

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111]">

              <div className="border-b border-white/10 p-5">

                <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-600">
                  Vista previa
                </p>

                <h2 className="mt-1 font-black">
                  Cómo lo verá el cliente
                </h2>

              </div>

              <div className="p-5">

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#141414]">

                  <div className="relative flex h-48 items-center justify-center overflow-hidden bg-[#1b1b1b]">

                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-6xl opacity-30">
                        🍔
                      </div>
                    )}

                    {!available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase">
                          Agotado
                        </span>
                      </div>
                    )}

                  </div>

                  <div className="p-5">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                      {selectedCategory?.name ||
                        "Categoría"}
                    </p>

                    <h3 className="mt-1 text-xl font-black">
                      {name ||
                        "Nombre del producto"}
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-neutral-500">
                      {description ||
                        "La descripción del producto aparecerá aquí."}
                    </p>

                    <div className="mt-5 flex items-center justify-between">

                      <span className="text-lg font-black">
                        $
                        {price
                          ? Number(
                              price
                            ).toLocaleString(
                              "es-AR"
                            )
                          : "0"}
                      </span>

                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-2xl">
                        +
                      </span>

                    </div>

                  </div>
                </div>

                {/* OPTIONS PREVIEW */}

                {optionGroups.length > 0 && (
                  <div className="mt-5 space-y-3">

                    {optionGroups.map(
                      (group) => (
                        <div
                          key={group.id}
                          className="rounded-2xl border border-white/10 bg-[#151515] p-4"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <p className="text-sm font-black">
                              {group.name ||
                                "Personalización"}
                            </p>

                            {group.required && (
                              <span className="text-[9px] font-black uppercase text-red-500">
                                Obligatorio
                              </span>
                            )}

                          </div>

                          <div className="mt-3 space-y-2">

                            {group.options.map(
                              (option) => (
                                <div
                                  key={
                                    option.id
                                  }
                                  className="flex items-center justify-between text-xs"
                                >

                                  <span className="text-neutral-400">
                                    {option.name ||
                                      "Opción"}
                                  </span>

                                  {option.price >
                                    0 && (
                                    <span className="font-bold text-neutral-500">
                                      +$
                                      {option.price.toLocaleString(
                                        "es-AR"
                                      )}
                                    </span>
                                  )}

                                </div>
                              )
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}

/* ================================= */
/* OPTION GROUP EDITOR */
/* ================================= */

function OptionGroupEditor({
  group,
  index,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  group: OptionGroup;
  index: number;
  onUpdate: (
    changes: Partial<OptionGroup>
  ) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onUpdateOption: (
    optionId: string,
    changes: Partial<OptionItem>
  ) => void;
  onDeleteOption: (
    optionId: string
  ) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#151515] p-4 sm:p-5">

      {/* GROUP HEADER */}

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-xs font-black text-red-500">
            {index}
          </span>

          <div className="min-w-0">

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Grupo de opciones
            </p>

            <p className="truncate text-xs text-neutral-500">
              Configurá las opciones que podrá
              elegir el cliente.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-xs font-bold text-neutral-600 transition hover:bg-red-500/10 hover:text-red-400"
        >
          Eliminar
        </button>

      </div>

      {/* GROUP SETTINGS */}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">

        <div>

          <label className="mb-2 block text-xs font-bold text-neutral-500">
            Nombre del grupo
          </label>

          <input
            value={group.name}
            onChange={(event) =>
              onUpdate({
                name: event.target.value,
              })
            }
            placeholder="Ej: Elegí tu tamaño"
            className="input"
          />

        </div>

        <div>

          <label className="mb-2 block text-xs font-bold text-neutral-500">
            Tipo de selección
          </label>

          <select
            value={group.type}
            onChange={(event) =>
              onUpdate({
                type: event.target
                  .value as
                  | "radio"
                  | "checkbox",
              })
            }
            className="input"
          >

            <option value="radio">
              Una opción
            </option>

            <option value="checkbox">
              Varias opciones
            </option>

          </select>

        </div>

      </div>

      {/* REQUIRED */}

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-[#1b1b1b] p-3">

        <input
          type="checkbox"
          checked={group.required}
          onChange={(event) =>
            onUpdate({
              required:
                event.target.checked,
            })
          }
          className="h-4 w-4 accent-red-600"
        />

        <span>

          <span className="block text-xs font-black">
            Selección obligatoria
          </span>

          <span className="mt-0.5 block text-[10px] text-neutral-600">
            El cliente deberá elegir una opción.
          </span>

        </span>

      </label>

      {/* OPTIONS */}

      <div className="mt-5">

        <div className="mb-3 flex items-center justify-between">

          <p className="text-xs font-black uppercase tracking-[0.15em] text-neutral-500">
            Opciones
          </p>

          <button
            type="button"
            onClick={onAddOption}
            className="text-xs font-black text-red-500 transition hover:text-red-400"
          >
            + Agregar opción
          </button>

        </div>

        {group.options.length === 0 ? (

          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-neutral-600">
            Todavía no agregaste opciones.
          </div>

        ) : (

          <div className="space-y-2">

            {group.options.map(
              (
                option,
                optionIndex
              ) => (

                <div
                  key={option.id}
                  className="grid grid-cols-[28px_1fr_110px_32px] items-center gap-2"
                >

                  <span className="text-center text-[10px] font-bold text-neutral-700">
                    {optionIndex + 1}
                  </span>

                  <input
                    value={option.name}
                    onChange={(event) =>
                      onUpdateOption(
                        option.id,
                        {
                          name:
                            event.target
                              .value,
                        }
                      )
                    }
                    placeholder="Nombre"
                    className="input h-11"
                  />

                  <div className="relative">

                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-600">
                      +$
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        option.price
                      }
                      onChange={(
                        event
                      ) =>
                        onUpdateOption(
                          option.id,
                          {
                            price:
                              Number(
                                event
                                  .target
                                  .value
                              ) || 0,
                          }
                        )
                      }
                      className="input h-11 pl-8"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onDeleteOption(
                        option.id
                      )
                    }
                    className="flex h-11 w-8 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Eliminar opción"
                  >
                    ×
                  </button>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

/* ================================= */
/* FIELD */
/* ================================= */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-bold text-neutral-500">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>
  );
}
