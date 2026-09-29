"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/**
 * Max one primary (magenta) button per screen — that is a design rule from the
 * system, not something this component can enforce, so use `secondary` freely.
 * Touch targets are 44px at `md` and above, because the real device is a
 * low-end Android held at arm's length.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--brand-magenta)] text-white hover:brightness-95 active:brightness-90 border border-transparent",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] border border-transparent hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]",
  danger:
    "bg-[var(--danger)] text-white hover:brightness-95 border border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-input)] font-medium",
        "transition-[background-color,filter] duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
