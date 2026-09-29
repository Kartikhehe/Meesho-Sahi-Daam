import { cn } from "@/lib/cn";

/**
 * The mark is a miniature Daam Meter: a rail, the floor and ceiling ticks,
 * and a price dot sitting inside the band between them. (An earlier draft put
 * the dot above the rail; it read as a person icon.) The brand and the product's signature
 * component tell the same story — a price that sits between the floor and
 * the ceiling.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="28" height="28" rx="8" fill="#F43397" />
      {/* The rail */}
      <rect x="4.5" y="12.75" width="19" height="2.5" rx="1.25" fill="#fff" fillOpacity="0.4" />
      {/* Floor and ceiling ticks, with the band between them */}
      <rect x="8.25" y="8.5" width="2" height="11" rx="1" fill="#fff" />
      <rect x="17.75" y="8.5" width="2" height="11" rx="1" fill="#fff" />
      <rect x="9" y="12.75" width="10" height="2.5" fill="#fff" />
      {/* The price, sitting inside the band */}
      <circle cx="14" cy="14" r="3.4" fill="#fff" stroke="#F43397" strokeWidth="1.4" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="hi text-[17px] font-semibold tracking-[-0.01em] text-white">सही दाम</span>
        {compact ? null : (
          <span className="mt-[3px] text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Sahi Daam
          </span>
        )}
      </span>
    </span>
  );
}
