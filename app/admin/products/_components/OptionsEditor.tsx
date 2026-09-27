"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  type EditorGroup,
  type EditorItem,
  type ProductOptionsData,
  fetchProductOptions,
  optionsApi,
} from "@/lib/admin/options";

type Mutate = (operation: Promise<boolean>) => Promise<void>;

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 disabled:opacity-50 sm:text-sm";

function nextSortOrder(list: { sortOrder: number }[]) {
  return list.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}

function parsePrice(text: string) {
  const value = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/*
 * Editor de grupos de opciones, ítems e ingredientes quitables de un
 * producto. Cada cambio se guarda al momento y después se recarga todo
 * desde la base (así lo que se ve es siempre lo guardado).
 */
export default function OptionsEditor({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductOptionsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchProductOptions(productId).then((result) => {
      if (cancelled) return;
      setLoadError(result === null);
      if (result) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const mutate: Mutate = async (operation) => {
    setBusy(true);
    setError(null);

    const ok = await operation;

    if (!ok) {
      setError("No se pudo guardar el cambio. Probá de nuevo.");
    }

    const result = await fetchProductOptions(productId);
    if (result) setData(result);

    setBusy(false);
  };

  if (!data) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#111111] p-6 text-sm text-neutral-500">
        {loadError ? "No pudimos cargar las opciones." : "Cargando opciones…"}
      </section>
    );
  }

  return (
    <div className="space-y-6" aria-busy={busy}>
      <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-black">Opciones y extras</h2>
            <p className="mt-1 text-xs text-neutral-500">
              “Una opción” = el cliente elige una (tamaño, guarnición). “Varias” =
              puede sumar varias (extras). Los precios se suman al precio base.
            </p>
          </div>
          {busy && <span className="text-xs font-bold text-neutral-500">Guardando…</span>}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-4">
          {data.groups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-neutral-500">
              Este producto no tiene opciones. Se agrega directo al carrito.
            </p>
          )}

          {data.groups.map((group) => (
            <GroupCard
              key={`${group.id}-${group.name}-${group.type}-${group.required}`}
              group={group}
              busy={busy}
              mutate={mutate}
            />
          ))}
        </div>

        <NewGroupForm
          busy={busy}
          onAdd={(values) =>
            mutate(optionsApi.addGroup(productId, values, nextSortOrder(data.groups)))
          }
        />
      </section>

      <IngredientsCard
        productId={productId}
        data={data}
        busy={busy}
        mutate={mutate}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GroupCard({
  group,
  busy,
  mutate,
}: {
  group: EditorGroup;
  busy: boolean;
  mutate: Mutate;
}) {
  const [name, setName] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(group.name);
      return;
    }
    if (trimmed !== group.name) {
      void mutate(optionsApi.updateGroup(group.id, { name: trimmed }));
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          aria-label="Nombre del grupo"
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
          className={`${inputClass} font-black sm:flex-1`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Tipo de selección"
            value={group.type}
            disabled={busy}
            onChange={(event) =>
              void mutate(
                optionsApi.updateGroup(group.id, {
                  type: event.target.value === "checkbox" ? "checkbox" : "radio",
                })
              )
            }
            className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm"
          >
            <option value="radio">Una opción</option>
            <option value="checkbox">Varias</option>
          </select>

          <button
            type="button"
            role="switch"
            aria-checked={group.required}
            disabled={busy}
            onClick={() =>
              void mutate(optionsApi.updateGroup(group.id, { required: !group.required }))
            }
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              group.required ? "bg-red-600 text-white" : "bg-white/5 text-neutral-400"
            }`}
          >
            {group.required ? "Obligatorio" : "Opcional"}
          </button>

          {confirmDelete ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void mutate(optionsApi.deleteGroup(group.id))}
                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black"
              >
                Borrar grupo
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 text-xs font-bold text-neutral-400"
              >
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label={`Borrar grupo ${group.name}`}
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl px-3 py-2 text-xs font-bold text-neutral-500 hover:text-red-300"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {group.items.map((item) => (
          <ItemRow
            key={`${item.id}-${item.name}-${item.price}-${item.available}`}
            item={item}
            busy={busy}
            mutate={mutate}
          />
        ))}
      </ul>

      <NewItemForm
        busy={busy}
        onAdd={(values) =>
          mutate(optionsApi.addItem(group.id, values, nextSortOrder(group.items)))
        }
      />
    </div>
  );
}

function ItemRow({
  item,
  busy,
  mutate,
}: {
  item: EditorItem;
  busy: boolean;
  mutate: Mutate;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));

  const save = () => {
    const trimmed = name.trim();
    const newPrice = parsePrice(price);

    if (!trimmed) {
      setName(item.name);
      return;
    }

    if (trimmed !== item.name || newPrice !== item.price) {
      void mutate(optionsApi.updateItem(item.id, { name: trimmed, price: newPrice }));
    }
  };

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.25rem_2.25rem] items-center gap-2">
      <input
        aria-label="Nombre de la opción"
        value={name}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
        onBlur={save}
        className={`${inputClass} ${item.available ? "" : "text-neutral-500 line-through"}`}
      />

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
          +$
        </span>
        <input
          aria-label="Precio adicional"
          inputMode="numeric"
          value={price}
          disabled={busy}
          onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
          onBlur={save}
          className={`${inputClass} pl-8`}
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={item.available}
        aria-label={item.available ? "Pausar opción" : "Activar opción"}
        title={item.available ? "Disponible" : "Pausada"}
        disabled={busy}
        onClick={() =>
          void mutate(optionsApi.updateItem(item.id, { available: !item.available }))
        }
        className={`h-9 w-9 shrink-0 rounded-xl text-sm ${
          item.available ? "bg-green-500/15 text-green-400" : "bg-white/5 text-neutral-600"
        }`}
      >
        {item.available ? "✓" : "⏸"}
      </button>

      <button
        type="button"
        aria-label={`Borrar ${item.name}`}
        disabled={busy}
        onClick={() => void mutate(optionsApi.deleteItem(item.id))}
        className="h-9 w-9 shrink-0 rounded-xl text-neutral-500 hover:bg-red-500/10 hover:text-red-300"
      >
        ✕
      </button>
    </li>
  );
}

function NewItemForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (values: { name: string; price: number }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    await onAdd({ name: name.trim(), price: parsePrice(price) });
    setName("");
    setPrice("");
  };

  return (
    <form
      onSubmit={submit}
      className="mt-3 grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-2"
    >
      <input
        aria-label="Nueva opción"
        placeholder="Nueva opción…"
        value={name}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
        className={inputClass}
      />
      <input
        aria-label="Precio de la nueva opción"
        placeholder="+$ 0"
        inputMode="numeric"
        value={price}
        disabled={busy}
        onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="h-9 shrink-0 rounded-xl bg-white/10 px-3 text-xs font-black disabled:opacity-40"
      >
        Agregar
      </button>
    </form>
  );
}

function NewGroupForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (values: { name: string; type: "radio" | "checkbox"; required: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"radio" | "checkbox">("radio");
  const [required, setRequired] = useState(true);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    await onAdd({ name: name.trim(), type, required });
    setName("");
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-white/15 p-4 sm:flex-row sm:items-center"
    >
      <input
        aria-label="Nombre del nuevo grupo"
        placeholder="Nuevo grupo (ej. Elegí tu salsa)"
        value={name}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
        className={`${inputClass} sm:flex-1`}
      />

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Tipo del nuevo grupo"
          value={type}
          onChange={(event) => {
            const value = event.target.value === "checkbox" ? "checkbox" : "radio";
            setType(value);
            setRequired(value === "radio");
          }}
          className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm"
        >
          <option value="radio">Una opción</option>
          <option value="checkbox">Varias</option>
        </select>

        <button
          type="button"
          role="switch"
          aria-checked={required}
          onClick={() => setRequired((value) => !value)}
          className={`rounded-xl px-3 py-2 text-xs font-black ${
            required ? "bg-red-600 text-white" : "bg-white/5 text-neutral-400"
          }`}
        >
          {required ? "Obligatorio" : "Opcional"}
        </button>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black disabled:opacity-40"
        >
          + Grupo
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function IngredientsCard({
  productId,
  data,
  busy,
  mutate,
}: {
  productId: string;
  data: ProductOptionsData;
  busy: boolean;
  mutate: Mutate;
}) {
  const [name, setName] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    await mutate(
      optionsApi.addIngredient(productId, name.trim(), nextSortOrder(data.ingredients))
    );
    setName("");
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6">
      <h2 className="text-xl font-black">Ingredientes que se pueden quitar</h2>
      <p className="mt-1 text-xs text-neutral-500">
        El cliente ve “¿Querés sacar algo?” con esta lista. Tocá uno para pausarlo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {data.ingredients.length === 0 && (
          <p className="text-sm text-neutral-500">Sin ingredientes quitables.</p>
        )}

        {data.ingredients.map((ingredient) => (
          <span
            key={ingredient.id}
            className={`flex items-center overflow-hidden rounded-full border text-sm font-bold ${
              ingredient.available
                ? "border-white/10 bg-[#161616]"
                : "border-white/5 bg-transparent text-neutral-600 line-through"
            }`}
          >
            <button
              type="button"
              disabled={busy}
              aria-pressed={!ingredient.available}
              onClick={() =>
                void mutate(
                  optionsApi.updateIngredient(ingredient.id, {
                    available: !ingredient.available,
                  })
                )
              }
              className="py-1.5 pl-4 pr-2"
            >
              {ingredient.name}
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={`Borrar ${ingredient.name}`}
              onClick={() => void mutate(optionsApi.deleteIngredient(ingredient.id))}
              className="py-1.5 pl-1 pr-3 text-neutral-500 hover:text-red-300"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          aria-label="Nuevo ingrediente"
          placeholder="Nuevo ingrediente…"
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-xl bg-white/10 px-4 text-xs font-black disabled:opacity-40"
        >
          Agregar
        </button>
      </form>
    </section>
  );
}

