import { Card } from "@/components/ui/card";
import { findNavItem } from "@/lib/nav";

type Props = {
  /** Screen code from the brief, e.g. "S3" or "A6". */
  section: string;
  title: string;
  /** What will live here. Falls back to the nav model's blurb. */
  description?: string;
  href?: string;
  /** Which build phase delivers this screen. */
  phase: number;
};

/**
 * A deliberately honest placeholder. It states which screen this is, what it
 * will contain, and which phase builds it — so that during a demo an unbuilt
 * route reads as "not yet" rather than as breakage. Every route in the brief
 * renders either a real page or one of these from Phase 1 onward.
 */
export function ComingSoon({ section, title, description, href, phase }: Props) {
  const blurb = description ?? (href ? findNavItem(href)?.blurb : undefined);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--text-muted)]">
            {section}
          </span>
          <span className="rounded-[var(--radius-chip)] border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-subtle)]">
            Phase {phase}
          </span>
        </div>

        <h1 className="mt-3 text-xl font-semibold text-[var(--text)]">{title}</h1>

        {blurb ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{blurb}</p>
        ) : null}

        <div className="mt-5 rounded-[var(--radius-input)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)] px-4 py-3">
          <p className="text-[13px] text-[var(--text-muted)]">
            This screen is built in phase {phase}. The route is live now so navigation never breaks
            mid-build.
          </p>
        </div>
      </Card>
    </div>
  );
}
