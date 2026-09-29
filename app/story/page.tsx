"use client";

/**
 * Story Mode landing.
 *
 * Sets expectations and then gets out of the way: the walkthrough drives the
 * real product, so this page is a table of contents, not a presentation.
 */

import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STORY } from "@/content/story";
import { useStartStory } from "@/components/story/story-rail";
import { useUiStore } from "@/lib/store/ui-store";
import { Page, PageHeader } from "@/components/shared/page-header";

export default function StoryPage() {
  const start = useStartStory();
  const setStoryStep = useUiStore((s) => s.setStoryStep);
  const setRole = useUiStore((s) => s.setRole);
  const setActiveSeller = useUiStore((s) => s.setActiveSeller);
  const router = useRouter();

  const jumpTo = (index: number) => {
    const step = STORY[index];
    if (!step) return;
    if (step.role) setRole(step.role);
    if (step.sellerId) setActiveSeller(step.sellerId);
    setStoryStep(index);
    router.push(step.href);
  };

  return (
    <Page width="narrow">
      <PageHeader
        titleHi="कहानी"
        title="Story mode"
        description="Nine steps through the real product, with every number computed live."
      />

      <Card className="mb-5 p-5">
        <p className="text-[14px] leading-relaxed text-[var(--text)]">
          This walkthrough drives the actual application. Every number you will see is computed by
          the engine from the simulated world — there are no screenshots and no mock states. The
          narration tells you where to look; the screen underneath is the product.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Arrow keys move between steps. <kbd className="rounded border border-[var(--border)] px-1 text-[11px]">Esc</kbd>{" "}
          exits at any point and leaves you wherever you were, free to explore.
        </p>
        <Button variant="primary" className="mt-4" onClick={start}>
          <PlayCircle size={15} aria-hidden />
          Start the walkthrough
        </Button>
      </Card>

      <h2 className="mb-2 text-[13px] font-semibold text-[var(--text)]">The nine steps</h2>
      <ol className="space-y-2">
        {STORY.map((step, i) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => jumpTo(i)}
              className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left hover:bg-[var(--surface-sunken)]"
            >
              <div className="flex items-start gap-3">
                <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[12px] font-semibold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2">
                    {step.titleHi ? (
                      <span className="hi text-[14px] font-semibold text-[var(--text)]">
                        {step.titleHi}
                      </span>
                    ) : null}
                    <span className="text-[12px] text-[var(--text-muted)]">{step.title}</span>
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    {step.narration}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </Page>
  );
}
