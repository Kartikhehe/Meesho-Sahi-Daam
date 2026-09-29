"use client";

import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useUiStore, type Theme } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

/** Applies the theme to <html data-theme>, which the token file keys off. */
export function useApplyTheme() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
}

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-[var(--radius-chip)] border border-[var(--border)] bg-[var(--surface)] p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition-colors",
            theme === value
              ? "bg-[var(--surface-sunken)] text-[var(--text)]"
              : "text-[var(--text-subtle)] hover:text-[var(--text)]",
          )}
        >
          <Icon size={14} aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
