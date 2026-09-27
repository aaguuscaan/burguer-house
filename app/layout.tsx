import type { Metadata, Viewport } from "next";

import { storeConfig } from "./data/store";
import "./globals.css";

import { siteUrl } from "@/lib/site";

const description = `${storeConfig.tagline} Burgers, pizzas, milanesas y más. Pedí online con delivery o retiro.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${storeConfig.name} · Pedí online`,
    template: `%s · ${storeConfig.name}`,
  },
  description,
  applicationName: storeConfig.name,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: storeConfig.name,
    title: `${storeConfig.name} · Pedí online`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${storeConfig.name} · Pedí online`,
    description,
  },
  appleWebApp: {
    capable: true,
    title: storeConfig.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
