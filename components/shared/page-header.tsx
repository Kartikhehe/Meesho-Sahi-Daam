import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Every screen opens the same way: an optional way back, the title, one line
 * on what the screen is for, and any actions — right-aligned on desktop,
 * stacked beneath on a phone.
 *
 * On seller screens Hindi leads and English follows in a lighter voice. On
 * manager and admin screens only `title` is passed.
 */
export function PageHeader({
  title,
  titleHi,
  description,
  eyebrow,
  actions,
  back,
  className,
}: {
  title: string;
  titleHi?: string;
  description?: ReactNode;
  /** A short context line above the title — a seller's name, a section. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {back ? (
        <Link
          href={back.href}
          className="-ml-1.5 mb-2 inline-flex min-h-9 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ChevronLeft size={15} aria-hidden />
          {back.label}
        </Link>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="type-caption mb-1.5 font-medium text-[var(--text-subtle)]">{eyebrow}</div>
          ) : null}
          {titleHi ? (
            <>
              <h1 className="hi type-h1 text-[var(--text)]">{titleHi}</h1>
              <p className="mt-0.5 text-[15px] font-medium text-[var(--text-muted)]">{title}</p>
            </>
          ) : (
            <h1 className="type-h1 text-[var(--text)]">{title}</h1>
          )}
          {description ? (
            <p className="type-small mt-2 max-w-2xl text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** A section heading inside a page. */
export function SectionHeading({
  title,
  titleHi,
  description,
  action,
  className,
}: {
  title: string;
  titleHi?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className={cn("type-h2 text-[var(--text)]", titleHi && "hi")}>{titleHi ?? title}</h2>
        {titleHi ? <p className="type-caption text-[var(--text-subtle)]">{title}</p> : null}
        {description ? (
          <p className="type-small mt-0.5 text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * The page column. Three widths only, so screens line up with each other:
 * `narrow` for reading and forms, `default` for most screens, `wide` for
 * dense tables.
 */
export function Page({
  width = "default",
  className,
  children,
}: {
  width?: "narrow" | "default" | "wide";
  className?: string;
  children: ReactNode;
}) {
  const max = width === "narrow" ? "max-w-3xl" : width === "wide" ? "max-w-7xl" : "max-w-5xl";
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8", max, className)}>{children}</div>;
}
