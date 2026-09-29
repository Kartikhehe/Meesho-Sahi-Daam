"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of an element, kept current as it resizes.
 *
 * Charts draw at their real pixel width rather than scaling a fixed viewBox.
 * A 720-unit chart squeezed into a 330px phone column shrinks its 11px labels
 * to about 5px — legible on a designer's monitor, useless on the device the
 * seller actually holds. Drawing at 1:1 keeps every label at its true size and
 * lets each chart decide what to drop when space runs out.
 */
export function useWidth<T extends HTMLElement = HTMLDivElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

/** Approximate rendered width of a label, for collision checks. */
export function textWidth(text: string, fontSize: number): number {
  // Devanagari clusters run wider per code point than Latin figures.
  let w = 0;
  for (const ch of text) w += /[ऀ-ॿ]/.test(ch) ? 0.52 : 0.6;
  return w * fontSize;
}
