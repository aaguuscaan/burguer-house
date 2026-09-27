/*
 * Horario semanal del local. Misma lógica que private.is_open en la base:
 *   - day: 0 = domingo … 6 = sábado
 *   - si close <= open, el turno termina al día siguiente (19:00 → 01:00)
 *   - sin turnos cargados = siempre abierto
 * La base es la que decide al confirmar; esto es para mostrarlo en pantalla.
 */

import type { Json } from "./database.types";

export type ScheduleRange = {
  day: number;
  open: string;
  close: string;
};

export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseSchedule(value: Json): ScheduleRange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return [];
    }

    const { day, open, close } = entry;

    return typeof day === "number" &&
      day >= 0 &&
      day <= 6 &&
      typeof open === "string" &&
      TIME_PATTERN.test(open) &&
      typeof close === "string" &&
      TIME_PATTERN.test(close)
      ? [{ day, open, close }]
      : [];
  });
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/* Día y minuto del día en la zona horaria del local. */
function localTime(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: WEEKDAYS[get("weekday")] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function isOpenAtLocal(schedule: ScheduleRange[], day: number, minutes: number) {
  if (schedule.length === 0) {
    return true;
  }

  const previousDay = (day + 6) % 7;

  return schedule.some((range) => {
    const open = toMinutes(range.open);
    const close = toMinutes(range.close);

    if (close > open) {
      return range.day === day && minutes >= open && minutes < close;
    }

    return (
      (range.day === day && minutes >= open) ||
      (range.day === previousDay && minutes < close)
    );
  });
}

export type StoreStatus =
  | { open: true; label: string }
  | { open: false; label: string; reason: "paused" | "closed" };

export function storeStatus(
  schedule: ScheduleRange[],
  timezone: string,
  acceptingOrders: boolean,
  date: Date
): StoreStatus {
  if (!acceptingOrders) {
    return {
      open: false,
      reason: "paused",
      label: "No estamos tomando pedidos en este momento",
    };
  }

  const { day, minutes } = localTime(timezone, date);

  if (isOpenAtLocal(schedule, day, minutes)) {
    const closing = closingTime(schedule, day, minutes);
    return { open: true, label: closing ? `Abierto hasta las ${closing}` : "Abierto" };
  }

  return { open: false, reason: "closed", label: nextOpeningLabel(schedule, day, minutes) };
}

function closingTime(schedule: ScheduleRange[], day: number, minutes: number) {
  const previousDay = (day + 6) % 7;

  const current = schedule.find((range) => {
    const open = toMinutes(range.open);
    const close = toMinutes(range.close);

    return close > open
      ? range.day === day && minutes >= open && minutes < close
      : (range.day === day && minutes >= open) ||
          (range.day === previousDay && minutes < close);
  });

  return current?.close ?? null;
}

function nextOpeningLabel(schedule: ScheduleRange[], day: number, minutes: number) {
  for (let offset = 0; offset < 7; offset += 1) {
    const targetDay = (day + offset) % 7;

    const candidates = schedule
      .filter((range) => range.day === targetDay)
      .filter((range) => offset > 0 || toMinutes(range.open) > minutes)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));

    if (candidates.length > 0) {
      const when =
        offset === 0 ? "hoy" : offset === 1 ? "mañana" : `el ${DAY_NAMES[targetDay].toLowerCase()}`;

      return `Cerrado · Abrimos ${when} a las ${candidates[0].open}`;
    }
  }

  return "Cerrado";
}

/* Resumen para mostrar: "Todos los días · 11:00 a 01:00" o por día. */
export function scheduleSummary(schedule: ScheduleRange[]): string[] {
  if (schedule.length === 0) {
    return ["Abierto las 24 horas"];
  }

  const byDay = DAY_NAMES.map((name, day) => ({
    name,
    ranges: schedule
      .filter((range) => range.day === day)
      .map((range) => `${range.open} a ${range.close}`)
      .join(" y "),
  }));

  const first = byDay[0].ranges;

  if (first && byDay.every((entry) => entry.ranges === first)) {
    return [`Todos los días · ${first}`];
  }

  return byDay.map((entry) => `${entry.name}: ${entry.ranges || "cerrado"}`);
}
