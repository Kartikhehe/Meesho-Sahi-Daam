import { BedDouble, CookingPot, Flower2, Gem, Layers, Shirt, Smartphone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Category } from "@/engine/types";

/**
 * An abstract product tile: the category's glyph on a wash of the product's
 * own colour family. No photographs — generated listings must never borrow a
 * real product image — but enough identity that a catalogue of ninety rows is
 * scannable by eye rather than read line by line.
 *
 * The wash is mixed against the current surface, so the same tile reads
 * correctly in light and dark themes without a second palette.
 */

const GLYPH: Record<Category, LucideIcon> = {
  kurti: Shirt,
  saree: Flower2,
  "co-ord-set": Layers,
  bedsheet: BedDouble,
  "kitchen-storage": CookingPot,
  "phone-cover": Smartphone,
  "jewellery-set": Gem,
};

/** Ink per colour family — muted, so a grid of tiles never turns into confetti. */
const INK: Record<string, string> = {
  red: "#b23a48",
  maroon: "#7d2b43",
  pink: "#b03a7a",
  yellow: "#a9791a",
  green: "#2f7a55",
  blue: "#2f5a9c",
  black: "#4a4455",
  white: "#7a7488",
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-[8px]", icon: 16 },
  md: { box: "h-11 w-11 rounded-[9px]", icon: 19 },
  lg: { box: "h-14 w-14 rounded-[12px]", icon: 24 },
} as const;

export function ProductTile({
  category,
  colour,
  size = "sm",
  className,
}: {
  category: Category;
  colour?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = GLYPH[category] ?? Shirt;
  const ink = INK[colour ?? ""] ?? INK.black ?? "#4a4455";
  const s = SIZES[size];

  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center", s.box, className)}
      style={{
        background: `color-mix(in srgb, ${ink} 14%, var(--surface))`,
        color: `color-mix(in srgb, ${ink} 70%, var(--text))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ink} 18%, transparent)`,
      }}
    >
      <Icon size={s.icon} strokeWidth={1.75} />
    </span>
  );
}
