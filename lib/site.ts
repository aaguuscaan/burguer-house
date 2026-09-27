/*
 * URL pública del sitio (para links absolutos: imagen al compartir,
 * seguimiento por WhatsApp). En Vercel se detecta sola; en otro hosting,
 * definí NEXT_PUBLIC_SITE_URL.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3000";
}
