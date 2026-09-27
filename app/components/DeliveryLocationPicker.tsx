"use client";

import { type FormEvent, useState } from "react";

import MapPicker from "./MapPicker";

import {
  type AddressResult,
  type LatLng,
  distanceKm,
  formatKm,
  reverseGeocode,
  searchAddress,
} from "@/lib/geo";

type Props = {
  store: LatLng;
  radiusKm: number;
  point: LatLng | null;
  /* label: dirección aproximada del punto, si se pudo obtener. */
  onChange: (point: LatLng, label: string | null) => void;
  onSwitchToPickup: () => void;
  hasError: boolean;
};

export default function DeliveryLocationPicker({
  store,
  radiusKm,
  point,
  onChange,
  onSwitchToPickup,
  hasError,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const distance = point ? distanceKm(store, point) : null;
  const inRange = distance !== null && distance <= radiusKm;

  /* Punto elegido en el mapa o por GPS: se busca la dirección aproximada. */
  const pickPoint = async (next: LatLng) => {
    setResults(null);
    setMessage(null);
    onChange(next, null);

    const label = await reverseGeocode(next);
    if (label) onChange(next, label);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = query.trim();
    if (text.length < 3) {
      setMessage("Escribí calle y número, y la localidad.");
      return;
    }

    setSearching(true);
    setMessage(null);

    const found = await searchAddress(text, store);

    setSearching(false);

    if (found === null) {
      setMessage("No pudimos buscar la dirección. Marcala tocando el mapa.");
    } else if (found.length === 0) {
      setMessage("No encontramos esa dirección. Probá con otra forma o marcala en el mapa.");
    }

    setResults(found && found.length > 0 ? found : null);
  };

  const handleLocate = () => {
    if (!("geolocation" in navigator)) {
      setMessage("Tu navegador no permite usar la ubicación. Marcala en el mapa.");
      return;
    }

    setLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void pickPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setLocating(false);
        console.warn("Geolocalización:", error);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Buscá tu dirección o marcala en el mapa."
            : "No pudimos obtener tu ubicación. Marcala en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div id="field-location" className="scroll-mt-24 space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscá tu dirección (calle, número, localidad)"
          aria-label="Buscar dirección"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#141414] px-4 text-base text-white outline-none placeholder:text-neutral-600 focus:border-red-600 sm:text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="h-12 shrink-0 rounded-2xl bg-white/10 px-4 text-sm font-black transition hover:bg-white/15 disabled:opacity-50"
        >
          {searching ? "…" : "Buscar"}
        </button>
      </form>

      {results && (
        <ul className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button
                type="button"
                onClick={() => {
                  setResults(null);
                  onChange({ lat: result.lat, lng: result.lng }, result.label);
                }}
                className="w-full border-b border-white/5 px-4 py-3 text-left text-sm last:border-0 hover:bg-white/5"
              >
                📍 {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm font-bold transition hover:border-white/20 disabled:opacity-50"
      >
        {locating ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "◎"
        )}
        {locating ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
      </button>

      <MapPicker
        center={store}
        storeMarker={store}
        circle={{ center: store, radiusKm }}
        point={point}
        onPick={(next) => void pickPoint(next)}
        className={`h-64 sm:h-72 ${hasError ? "ring-2 ring-red-500/60" : ""}`}
      />

      <p className="text-center text-[11px] text-neutral-600">
        Tocá el mapa o arrastrá el pin para marcar tu casa. El círculo rojo es
        nuestra zona de delivery ({radiusKm} km).
      </p>

      {message && (
        <p role="status" className="text-xs font-bold text-yellow-300">
          {message}
        </p>
      )}

      {distance !== null &&
        (inRange ? (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-sm font-black text-green-400">✓ ¡Llegamos a tu casa!</p>
            <p className="mt-1 text-xs text-neutral-400">
              Estás a {formatKm(distance)} del local.
            </p>
          </div>
        ) : (
          <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm font-black text-red-400">
              ✗ Estás fuera de nuestra zona de delivery
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Tu ubicación está a {formatKm(distance)} y llegamos hasta {radiusKm} km.
            </p>
            <button
              type="button"
              onClick={onSwitchToPickup}
              className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/15"
            >
              Cambiar a retiro en el local
            </button>
          </div>
        ))}
    </div>
  );
}
