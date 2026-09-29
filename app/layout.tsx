import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Fonts: the design calls for Inter + Noto Sans Devanagari. We do NOT use
 * next/font/google here — that fetches at build time, and this prototype must
 * build and run on a laptop with no internet. The CSS font stack falls back to
 * the platform UI font, and Devanagari falls back to the system Devanagari
 * face, which every Android and macOS ships. Drop the woff2 files into
 * /public/fonts and switch to next/font/local to pin the exact faces.
 */

export const metadata: Metadata = {
  title: "Sahi Daam — a price that lets you survive",
  description:
    "A price operating system for new-to-online Meesho sellers: the survival floor, the visibility ceiling, and the maths behind both.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#570D45",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
