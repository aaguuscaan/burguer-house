import type { MetadataRoute } from "next";

import { storeConfig } from "./data/store";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${storeConfig.name} · Pedí online`,
    short_name: storeConfig.name,
    description: storeConfig.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    lang: "es-AR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
