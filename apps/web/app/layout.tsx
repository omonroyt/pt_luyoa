import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copiloto Café Alborada",
  description: "Pregúntale cómo va tu negocio y lanza campañas con datos reales.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
