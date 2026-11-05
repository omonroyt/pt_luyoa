import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";
import { InlineScript } from "@/components/ui/inline-script";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme";
import "./globals.css";

// ES: Geist para la interfaz y Fraunces (serif editorial) para la marca y los títulos.
//     next/font las sirve desde el mismo dominio, sin solicitudes a Google al navegar.
// EN: Geist for the interface and Fraunces (editorial serif) for the brand and headings.
//     next/font serves them from the same domain, with no requests to Google at runtime.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Copiloto Café Alborada",
  description: "Pregúntale cómo va tu negocio y lanza campañas con datos reales.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0b09" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es-MX"
      className={`${geist.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* ES: Aplica el tema guardado antes de pintar. EN: Applies the stored theme before painting. */}
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
