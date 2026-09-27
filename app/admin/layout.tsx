import type { Metadata } from "next";

import AdminFrame from "./components/AdminFrame";

export const metadata: Metadata = {
  title: "Admin · Burger House",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminFrame>{children}</AdminFrame>;
}
