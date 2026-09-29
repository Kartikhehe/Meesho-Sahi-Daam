"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/**
 * One primary (magenta) button per screen is a design rule, not something this
 * component can enforce — reach for `secondary` by default.
 *
 * The primary fill is the deepened brand magenta (--brand-fill), not Meesho's
 * #F43397: white text on the signature pink only reaches 3.6:1, which fails
 * WCAG AA for button labels. The deeper tone keeps the hue and passes at 4.9:1.
 *
 * `md` and up are 44px tall — the real device is a low-end Android at arm's
 * length.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--brand-fill)] text-white border border-transparent hover:bg-[var(--brand-fill-hover)] shadow-[0_1px_0_rgba(0,0,0,0.08)]",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:border-[var(--text-subtle)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] border border-transparent hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]",
  quiet:
    "bg-[var(--surface-sunken)] text-[var(--text)] border border-transparent hover:bg-[var(--border)]",
  danger:
    "bg-[var(--danger)] text-white border border-transparent hover:brightness-95 dark:text-[#1c1622]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-input)] font-medium",
        "transition-[background-color,border-color,color] duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
