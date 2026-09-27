"use client";

import { type ReactNode, useEffect, useState } from "react";

import MapPicker from "@/app/components/MapPicker";
import { type SettingsUpdate, saveSettings } from "@/lib/admin/settings";
import { type LatLng } from "@/lib/geo";
import { DAY_NAMES, type ScheduleRange } from "@/lib/schedule";
import { type StoreSettings, fetchStoreSettings } from "@/lib/store-settings";

type DayRow = {
  enabled: boolean;
  open: string;
  close: string;
};

type FormValues = {
  acceptingOrders: boolean;
  days: DayRow[];
  deliveryEnabled: boolean;
  deliveryRadiusKm: string;
  deliveryFee: string;
  deliveryFreeFrom: string;
  location: LatLng | null;
  whatsapp: string;
  phone: string;
  address: string;
  instagram: string;
};

const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 };
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toForm(settings: StoreSettings): FormValues {
  return {
    acceptingOrders: settings.acceptingOrders,
    days: DAY_NAMES.map((_, day) => {
      const range = settings.schedule.find((item) => item.day === day);
      return range
        ? { enabled: true, open: range.open, close: range.close }
        : { enabled: false, open: "19:00", close: "00:00" };
    }),
    deliveryEnabled: settings.deliveryEnabled,
    deliveryRadiusKm: String(settings.deliveryRadiusKm),
    deliveryFee: String(settings.deliveryFee),
    deliveryFreeFrom: settings.deliveryFreeFrom === null ? "" : String(settings.deliveryFreeFrom),
    location: settings.location,
    whatsapp: settings.whatsapp,
    phone: settings.phone,
    address: settings.address,
    instagram: settings.instagram,
  };
}

type Errors = Partial<Record<"schedule" | "radius" | "fee" | "freeFrom" | "whatsapp", string>>;

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  const radius = Number(values.deliveryRadiusKm);
  const fee = Number(values.deliveryFee);

  if (
    values.days.some(
      (day) => day.enabled && (!TIME_PATTERN.test(day.open) || !TIME_PATTERN.test(day.close))
    )
  ) {
    errors.schedule = "Revisá los horarios (formato HH:MM).";
  }

  if (!Number.isFinite(radius) || radius < 0.5 || radius > 100) {
    errors.radius = "Entre 0,5 y 100 km.";
  }

  if (!Number.isFinite(fee) || fee < 0) {
    errors.fee = "Poné un costo válido (0 = gratis).";
  }

  if (values.deliveryFreeFrom.trim() && !(Number(values.deliveryFreeFrom) > 0)) {
    errors.freeFrom = "Dejalo vacío o poné un monto mayor a 0.";
  }

  const digits = values.whatsapp.replace(/\D/g, "");
  if (digits && (digits.length < 10 || digits.length > 15)) {
    errors.whatsapp = "Con código de país, ej. 5491123456789.";
  }

  return errors;
}

function toUpdate(values: FormValues): SettingsUpdate {
  const schedule: ScheduleRange[] = values.days.flatMap((day, index) =>
    day.enabled ? [{ day: index, open: day.open, close: day.close }] : []
  );

  return {
    acceptingOrders: values.acceptingOrders,
    schedule,
    deliveryEnabled: values.deliveryEnabled,
    deliveryRadiusKm: Number(values.deliveryRadiusKm),
    deliveryFee: Number(values.deliveryFee),
    deliveryFreeFrom: values.deliveryFreeFrom.trim() ? Number(values.deliveryFreeFrom) : null,
    location: values.location,
    whatsapp: values.whatsapp.replace(/\D/g, ""),
    phone: values.phone.trim(),
    address: values.address.trim(),
    instagram: values.instagram.trim(),
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null | "error">(null);

  useEffect(() => {
    let cancelled = false;

    fetchStoreSettings().then((result) => {
      if (!cancelled) setSettings(result ?? "error");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">Local</p>
      <h1 className="mt-1 text-3xl font-black">Configuración</h1>

      {settings === null ? (
        <div className="mt-6 h-96 animate-pulse rounded-3xl bg-[#141414]" />
      ) : settings === "error" ? (
        <p className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 font-black text-red-300">
          No pudimos cargar la configuración.
        </p>
      ) : (
        <SettingsForm initial={toForm(settings)} />
      )}
    </div>
  );
}

function SettingsForm({ initial }: { initial: FormValues }) {
  const [values, setValues] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const errors = validate(values);
  const hasErrors = Object.keys(errors).length > 0;
  const error = (key: keyof Errors) => (showErrors ? errors[key] : undefined);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const setDay = (index: number, patch: Partial<DayRow>) => {
    setValues((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
    }));
    setMessage(null);
  };

  const copyToAll = (index: number) => {
    const source = values.days[index];
    setValues((current) => ({
      ...current,
      days: current.days.map(() => ({ ...source })),
    }));
    setMessage(null);
  };

  const handleSave = async () => {
    if (hasErrors) {
      setShowErrors(true);
      setMessage({ ok: false, text: "Revisá los campos marcados." });
      return;
    }

    setSaving(true);
    const ok = await saveSettings(toUpdate(values));
    setSaving(false);

    setMessage(
      ok
        ? { ok: true, text: "Configuración guardada ✓" }
        : { ok: false, text: "No pudimos guardar. Probá de nuevo." }
    );
  };

  const radius = Number(values.deliveryRadiusKm);

  return (
    <div className="mt-6 space-y-6 pb-28">
      {/* PEDIDOS */}
      <Card title="Recepción de pedidos">
        <Switch
          checked={values.acceptingOrders}
          onChange={(checked) => set("acceptingOrders", checked)}
          label={values.acceptingOrders ? "Recibiendo pedidos" : "Pedidos pausados"}
          description="Pausalo si se llena la cocina o hay un imprevisto. La tienda sigue visible."
        />
      </Card>

      {/* HORARIOS */}
      <Card
        title="Horarios"
        description="Si cierra después de medianoche, poné el horario de cierre del día siguiente (ej. 19:00 a 01:00)."
      >
        <ul className="space-y-2">
          {values.days.map((day, index) => (
            <li
              key={DAY_NAMES[index]}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#0c0c0c] p-3"
            >
              <button
                type="button"
                role="switch"
                aria-checked={day.enabled}
                onClick={() => setDay(index, { enabled: !day.enabled })}
                className={`w-28 rounded-xl px-3 py-2 text-left text-sm font-black ${
                  day.enabled ? "bg-red-600/15 text-white" : "bg-white/5 text-neutral-500"
                }`}
              >
                {DAY_NAMES[index]}
              </button>

              {day.enabled ? (
                <>
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[index]} abre`}
                    value={day.open}
                    onChange={(event) => setDay(index, { open: event.target.value })}
                    className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm [color-scheme:dark]"
                  />
                  <span className="text-xs text-neutral-500">a</span>
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[index]} cierra`}
                    value={day.close}
                    onChange={(event) => setDay(index, { close: event.target.value })}
                    className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm [color-scheme:dark]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToAll(index)}
                    className="ml-auto text-[11px] font-bold text-neutral-500 hover:text-white"
                  >
                    Copiar a todos
                  </button>
                </>
              ) : (
                <span className="text-sm text-neutral-500">Cerrado</span>
              )}
            </li>
          ))}
        </ul>
        <FieldError text={error("schedule")} />
      </Card>

      {/* DELIVERY */}
      <Card title="Delivery">
        <Switch
          checked={values.deliveryEnabled}
          onChange={(checked) => set("deliveryEnabled", checked)}
          label={values.deliveryEnabled ? "Delivery activo" : "Solo retiro en el local"}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Radio (km)"
            value={values.deliveryRadiusKm}
            onChange={(value) => set("deliveryRadiusKm", value)}
            error={error("radius")}
          />
          <NumberField
            label="Costo de envío ($)"
            value={values.deliveryFee}
            onChange={(value) => set("deliveryFee", value)}
            error={error("fee")}
          />
          <NumberField
            label="Envío gratis desde ($)"
            value={values.deliveryFreeFrom}
            placeholder="Sin envío gratis"
            onChange={(value) => set("deliveryFreeFrom", value)}
            error={error("freeFrom")}
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            Ubicación del local
          </p>
          <MapPicker
            center={values.location ?? DEFAULT_CENTER}
            circle={
              values.location && Number.isFinite(radius) && radius > 0
                ? { center: values.location, radiusKm: radius }
                : null
            }
            point={values.location}
            onPick={(point) => set("location", point)}
            pinLabel="🍔"
            className="h-80"
          />
          <p className="mt-2 text-xs text-neutral-500">
            Tocá el mapa o arrastrá 🍔 hasta la puerta del local. El círculo muestra hasta dónde
            llega el delivery.
          </p>
        </div>
      </Card>

      {/* CONTACTO */}
      <Card title="Contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="WhatsApp de pedidos"
            value={values.whatsapp}
            placeholder="5491123456789"
            inputMode="tel"
            onChange={(value) => set("whatsapp", value)}
            error={error("whatsapp")}
          />
          <TextField
            label="Teléfono"
            value={values.phone}
            inputMode="tel"
            onChange={(value) => set("phone", value)}
          />
          <TextField
            label="Dirección"
            value={values.address}
            onChange={(value) => set("address", value)}
          />
          <TextField
            label="Instagram"
            value={values.instagram}
            placeholder="@tulocal"
            onChange={(value) => set("instagram", value)}
          />
        </div>
      </Card>

      {/* GUARDAR */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090909]/95 p-4 backdrop-blur-xl lg:left-60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p
            role="status"
            className={`text-sm font-bold ${message?.ok ? "text-green-400" : "text-red-300"}`}
          >
            {message?.text}
          </p>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-black transition hover:bg-red-500 disabled:opacity-60"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-6">
      <h2 className="text-lg font-black">{title}</h2>
      {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 text-left"
    >
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-green-500" : "bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-black">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-neutral-500">{description}</span>}
      </span>
    </button>
  );
}

const inputClass =
  "w-full rounded-2xl border bg-[#161616] px-4 py-3 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 sm:text-sm";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "tel" | "text";
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${error ? "border-red-500/60" : "border-white/10"}`}
      />
      <FieldError text={error} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={(next) => onChange(next.replace(/[^\d.]/g, ""))}
      error={error}
    />
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? <span className="mt-1.5 block text-xs font-bold text-red-400">{text}</span> : null;
}
