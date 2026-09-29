"use client";

/**
 * The Story Mode narration rail.
 *
 * It docks to the bottom of the real app rather than covering it — the whole
 * point is that you are looking at the product, not at a slideshow. Arrow keys
 * move between steps, Esc exits at any point, and exiting leaves you on
 * whatever screen you were reading.
 */

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { STORY, STORY_LENGTH } from "@/content/story";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

export function StoryRail() {
  const router = useRouter();
  const storyStep = useUiStore((s) => s.storyStep);
  const setStoryStep = useUiStore((s) => s.setStoryStep);
  const setRole = useUiStore((s) => s.setRole);
  const setActiveSeller = useUiStore((s) => s.setActiveSeller);

  const active = storyStep !== null && storyStep >= 0 && storyStep < STORY_LENGTH;
  const step = active ? STORY[storyStep] : null;

  /** Put the app into the state this step needs, then go there. */
  const goToStep = useCallback(
    (index: number) => {
      const next = STORY[index];
      if (!next) return;
      if (next.role) setRole(next.role);
      if (next.sellerId) setActiveSeller(next.sellerId);
      setStoryStep(index);
      router.push(next.href);

      // `router.push` does not fire `hashchange` when only the hash differs,
      // so a step that deep-links to a tab (…/sku/x#market) would leave the
      // page on whichever tab was already open. Nudge it after the navigation.
      if (next.href.includes("#")) {
        const hash = next.href.slice(next.href.indexOf("#"));
        setTimeout(() => {
          if (window.location.hash !== hash) window.location.hash = hash;
          else window.dispatchEvent(new HashChangeEvent("hashchange"));
        }, 80);
      }
    },
    [router, setRole, setActiveSeller, setStoryStep],
  );

  const exit = useCallback(() => setStoryStep(null), [setStoryStep]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      // Do not hijack typing in a field.
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      } else if (e.key === "ArrowRight" && storyStep !== null && storyStep < STORY_LENGTH - 1) {
        e.preventDefault();
        goToStep(storyStep + 1);
      } else if (e.key === "ArrowLeft" && storyStep !== null && storyStep > 0) {
        e.preventDefault();
        goToStep(storyStep - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, storyStep, goToStep, exit]);

  if (!active || !step || storyStep === null) return null;

  const isFirst = storyStep === 0;
  const isLast = storyStep === STORY_LENGTH - 1;

  return (
    <aside
      aria-label="Story mode narration"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-2px_12px_rgba(28,28,40,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-3 md:px-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded-[var(--radius-chip)] bg-[var(--brand-jamuni)] px-2 py-0.5 text-[11px] font-semibold text-white">
                {storyStep + 1} / {STORY_LENGTH}
              </span>
              {step.titleHi ? (
                <span className="hi text-[15px] font-semibold text-[var(--text)]">
                  {step.titleHi}
                </span>
              ) : null}
              <span
                className={cn(
                  step.titleHi
                    ? "text-[12px] text-[var(--text-muted)]"
                    : "text-[15px] font-semibold text-[var(--text)]",
                )}
              >
                {step.title}
              </span>
            </div>

            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text)]">
              {step.narration}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
              <strong className="text-[var(--text)]">Look at:</strong> {step.lookFor}
            </p>
          </div>

          <button
            type="button"
            onClick={exit}
            className="shrink-0 rounded-[var(--radius-input)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
          >
            <X size={16} aria-hidden />
            <span className="sr-only">Exit story mode</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goToStep(storyStep - 1)}
            disabled={isFirst}
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-strong)] px-3 text-[13px] font-medium text-[var(--text)] disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden />
            Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={exit}
              className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-input)] bg-[var(--brand-magenta)] px-3 text-[13px] font-medium text-white"
            >
              Finish and explore freely
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(storyStep + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-input)] bg-[var(--brand-magenta)] px-3 text-[13px] font-medium text-white"
            >
              Next
              <ChevronRight size={14} aria-hidden />
            </button>
          )}

          <ol className="ml-1 flex flex-wrap items-center gap-1" aria-label="Story steps">
            {STORY.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-current={i === storyStep ? "step" : undefined}
                  title={s.title}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === storyStep
                      ? "w-6 bg-[var(--brand-magenta)]"
                      : i < storyStep
                        ? "w-2 bg-[var(--brand-jamuni)] opacity-50"
                        : "w-2 bg-[var(--border-strong)]",
                  )}
                >
                  <span className="sr-only">
                    Step {i + 1}: {s.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <span className="ml-auto hidden text-[11px] text-[var(--text-subtle)] sm:inline">
            ← → to move · Esc to exit
          </span>
        </div>
      </div>
    </aside>
  );
}

/** Starts the story from step one. Used by the story landing page and the nav. */
export function useStartStory() {
  const router = useRouter();
  const setStoryStep = useUiStore((s) => s.setStoryStep);
  const setRole = useUiStore((s) => s.setRole);
  const setActiveSeller = useUiStore((s) => s.setActiveSeller);

  return useCallback(() => {
    const first = STORY[0];
    if (!first) return;
    if (first.role) setRole(first.role);
    if (first.sellerId) setActiveSeller(first.sellerId);
    setStoryStep(0);
    router.push(first.href);
  }, [router, setRole, setActiveSeller, setStoryStep]);
}
