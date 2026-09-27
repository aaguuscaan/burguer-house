export const PLACEHOLDER_IMAGE = "/images/products/placeholder.svg";

export function productImage(url: string | null | undefined) {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PLACEHOLDER_IMAGE;
}

/*
 * Las imágenes externas (cargadas desde el admin con una URL) no están en
 * images.remotePatterns, así que se muestran sin optimizar en lugar de
 * romper la página.
 */
export function isRemoteImage(src: string) {
  return /^https?:\/\//.test(src);
}
