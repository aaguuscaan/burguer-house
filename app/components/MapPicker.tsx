"use client";

import "leaflet/dist/leaflet.css";

import type { Circle, Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useEffectEvent, useRef } from "react";

import type { LatLng } from "@/lib/geo";

type Props = {
  /* Centro inicial del mapa. */
  center: LatLng;
  /* Marcador fijo del local (no se mueve). */
  storeMarker?: LatLng | null;
  /* Círculo de la zona de delivery. */
  circle?: { center: LatLng; radiusKm: number } | null;
  /* Punto elegido (se mueve tocando el mapa o arrastrando el pin). */
  point: LatLng | null;
  onPick: (point: LatLng) => void;
  pinLabel?: string;
  className?: string;
};

/*
 * Mapa con Leaflet + teselas de OpenStreetMap/CARTO (sin clave ni costo).
 * Leaflet usa window, por eso se importa dinámicamente dentro del efecto.
 */
export default function MapPicker({
  center,
  storeMarker = null,
  circle = null,
  point,
  onPick,
  pinLabel = "📍",
  className = "h-72",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const pinRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const handlePick = useEffectEvent((next: LatLng) => onPick(next));

  /* Dibuja / mueve el pin y el círculo según las props actuales. */
  const syncLayers = useEffectEvent(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (circle) {
      const latLng: [number, number] = [circle.center.lat, circle.center.lng];

      if (circleRef.current) {
        circleRef.current.setLatLng(latLng).setRadius(circle.radiusKm * 1000);
      } else {
        circleRef.current = L.circle(latLng, {
          radius: circle.radiusKm * 1000,
          color: "#ef4444",
          weight: 2,
          fillColor: "#ef4444",
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    if (point) {
      const latLng: [number, number] = [point.lat, point.lng];

      if (pinRef.current) {
        pinRef.current.setLatLng(latLng);
      } else {
        pinRef.current = L.marker(latLng, {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: `<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 4px 6px rgba(0,0,0,.6))">${pinLabel}</div>`,
            iconSize: [0, 0],
          }),
        })
          .on("dragend", () => {
            const position = pinRef.current?.getLatLng();
            if (position) handlePick({ lat: position.lat, lng: position.lng });
          })
          .addTo(map);
      }

      if (!map.getBounds().pad(-0.1).contains(latLng)) {
        map.panTo(latLng);
      }
    } else if (pinRef.current) {
      pinRef.current.remove();
      pinRef.current = null;
    }
  });

  /* Crea el mapa con las props del primer render. */
  const createMap = useEffectEvent((L: typeof import("leaflet")) => {
    if (!containerRef.current) return;

    leafletRef.current = L;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 12,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    if (storeMarker) {
      L.marker([storeMarker.lat, storeMarker.lng], {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: '<div style="transform:translate(-50%,-50%);width:36px;height:36px;border-radius:9999px;background:#dc2626;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.5)">🍔</div>',
          iconSize: [0, 0],
        }),
      }).addTo(map);
    }

    map.on("click", (event) => {
      handlePick({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    syncLayers();

    /*
     * El contenedor puede cambiar de tamaño después de crear el mapa
     * (animaciones, fuentes, teclado en mobile): se recalcula y, la
     * primera vez que tiene tamaño real, se encuadra la zona.
     */
    const initialCircle = circle;
    let framed = false;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();

      if (!framed && containerRef.current && containerRef.current.clientHeight > 0) {
        framed = true;

        if (initialCircle) {
          map.fitBounds(
            L.latLng(initialCircle.center.lat, initialCircle.center.lng).toBounds(
              initialCircle.radiusKm * 2000
            ),
            { padding: [12, 12] }
          );
        }
      }
    });

    observer.observe(containerRef.current);
    observerRef.current = observer;
  });

  /* Leaflet usa window: se importa en el navegador, una sola vez. */
  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (!cancelled) createMap(L);
    });

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      pinRef.current = null;
      circleRef.current = null;
    };
  }, []);

  /* Cambios de punto o de círculo → actualizar capas. */
  const pointKey = point ? `${point.lat},${point.lng}` : "";
  const circleKey = circle
    ? `${circle.center.lat},${circle.center.lng},${circle.radiusKm}`
    : "";

  useEffect(() => {
    syncLayers();
  }, [pointKey, circleKey]);

  return (
    <div
      ref={containerRef}
      className={`z-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141414] ${className}`}
      role="application"
      aria-label="Mapa: tocá para marcar tu ubicación"
    />
  );
}
