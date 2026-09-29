import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts, bundled from node_modules at build time — so the
// app still runs with the network off. Each package splits its faces by
// unicode-range, so a page only downloads the scripts it actually renders.
//
// Plus Jakarta Sans: a geometric-humanist sans close in spirit to Meesho's
// proprietary Mier, with real tabular figures and a ₹ glyph in its latin-ext
// subset. Noto Sans Devanagari: the most complete, most even Devanagari face
// available, with a weight axis wide enough to match the Latin at every step.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Sahi Daam — the price that lets you survive",
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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
