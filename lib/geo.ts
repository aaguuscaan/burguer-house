export type LatLng = {
  lat: number;
  lng: number;
};

/* Distancia en línea recta (Haversine), igual que private.distance_km. */
export function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number) {
  return `${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

/*
 * Geocodificación con Nominatim (OpenStreetMap). Gratis, sin clave, con
 * límite de 1 consulta por segundo: se usa solo al tocar "Buscar" o al
 * marcar un punto, nunca mientras se escribe.
 * Para producción con mucho tráfico conviene Google Places o Mapbox.
 */

export type AddressResult = LatLng & {
  label: string;
};

const NOMINATIM = "https://nominatim.openstreetmap.org";

function shortLabel(result: {
  display_name: string;
  address?: Record<string, string | undefined>;
}) {
  const address = result.address;

  if (!address) {
    return result.display_name.split(",").slice(0, 3).join(",").trim();
  }

  const street = [address.road, address.house_number].filter(Boolean).join(" ");
  const area =
    address.neighbourhood ??
    address.suburb ??
    address.village ??
    address.town ??
    address.city;

  return [street, area].filter(Boolean).join(", ") || result.display_name;
}

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

function isNominatimResult(value: unknown): value is NominatimResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    typeof value.lat === "string" &&
    "lon" in value &&
    typeof value.lon === "string" &&
    "display_name" in value &&
    typeof value.display_name === "string"
  );
}

export async function searchAddress(
  query: string,
  near: LatLng
): Promise<AddressResult[] | null> {
  const box = 0.4;
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "ar",
    "accept-language": "es",
    viewbox: `${near.lng - box},${near.lat + box},${near.lng + box},${near.lat - box}`,
    bounded: "0",
  });

  try {
    const response = await fetch(`${NOMINATIM}/search?${params}`);

    if (!response.ok) {
      console.error("Error buscando dirección:", response.status);
      return null;
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return null;
    }

    return data.filter(isNominatimResult).map((result) => ({
      lat: Number(result.lat),
      lng: Number(result.lon),
      label: shortLabel(result),
    }));
  } catch (error) {
    console.error("Error buscando dirección:", error);
    return null;
  }
}

export async function reverseGeocode(point: LatLng): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "es",
  });

  try {
    const response = await fetch(`${NOMINATIM}/reverse?${params}`);

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();

    return isNominatimResult(data) ? shortLabel(data) : null;
  } catch (error) {
    console.error("Error obteniendo la dirección del punto:", error);
    return null;
  }
}
