"use client";

import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useUiStore, type Theme } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "Match device" },
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

/**
 * `onBar` styles it for the jamuni top bar; otherwise it sits on a surface
 * (the mobile "More" sheet).
 */
export function ThemeToggle({ onBar = true }: { onBar?: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "flex items-center gap-0.5 rounded-full p-0.5",
        onBar ? "bg-white/[0.08]" : "bg-[var(--surface-sunken)]",
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full px-2 transition-colors",
              onBar
                ? active
                  ? "bg-white/[0.18] text-white"
                  : "text-white/55 hover:text-white"
                : active
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            <Icon size={14} aria-hidden />
            {onBar ? <span className="sr-only">{label}</span> : <span className="text-[12px] font-medium">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
