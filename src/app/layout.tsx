import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jaeger Enterprise Group",
  description: "Sistema ERP de Jaeger Enterprise Group"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
