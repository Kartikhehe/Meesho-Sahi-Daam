/**
 * The trace system.
 *
 * The product's promise is "हिसाब देखें — see the maths". That has to be
 * structural, not cosmetic: every engine function that produces a number a
 * human will see returns the number AND its derivation, computed in the same
 * pass from the same intermediates. A number and its explanation therefore
 * cannot drift apart, because they are one value.
 *
 * Pure TypeScript. No React, no browser globals — this file must be importable
 * from a plain Node script.
 */

export type Unit = "INR" | "PCT" | "RATIO" | "COUNT";

/**
 * Where a number came from. Rendered as a colour in the trace drawer so a
 * seller can see at a glance which figures are hers, which are the platform's
 * measurements, and which are our modelling.
 */
export type Source =
  /** The seller typed it. */
  | "seller_input"
  /** Measured from her own settlement/order history. */
  | "platform_ledger"
  /** Derived from the competing listings in her design cluster. */
  | "cluster_model"
  /** A published industry benchmark. See constants.ts for the citation. */
  | "benchmark"
  /** Computed from the steps above. */
  | "derived";

export type TraceStep = {
  /** "Reverse freight on failed parcels" */
  label: string;
  /** "वापसी का भाड़ा" */
  labelHi: string;
  /** "0.336 × ₹75.60" — the arithmetic, shown literally. */
  formula: string;
  value: number;
  unit: Unit;
  source: Source;
  /** "From your last 90 days of Valmo settlements" */
  sourceNote?: string;
  /** Nested derivations, so a step can be opened up further. */
  children?: TraceStep[];
  /**
   * Where the input came from, as a chip: "SELLER", "MEESHO · exact",
   * "MEESHO · prior: design cluster, n=1,240", "Statutory".
   */
  basis?: string;
};

export type Assumption = {
  key: string;
  label: string;
  labelHi?: string;
  value: number;
  unit: Unit;
  source: Source;
  /** Why this value, and what happens if it is wrong. */
  note: string;
};

/** The universal engine return type. See PLAN.md §D2. */
export type Traced<T> = {
  value: T;
  trace: TraceStep[];
  assumptions: Assumption[];
};

// --- builders -------------------------------------------------------------

export function step(
  label: string,
  labelHi: string,
  formula: string,
  value: number,
  unit: Unit,
  source: Source,
  sourceNote?: string,
  children?: TraceStep[],
): TraceStep {
  return { label, labelHi, formula, value, unit, source, sourceNote, children };
}

export function traced<T>(
  value: T,
  trace: TraceStep[],
  assumptions: Assumption[] = [],
): Traced<T> {
  return { value, trace, assumptions };
}

/** Lift a plain number into a Traced with a single self-describing step. */
export function tracedConst(
  value: number,
  label: string,
  labelHi: string,
  unit: Unit,
  source: Source,
  sourceNote?: string,
): Traced<number> {
  return traced(value, [step(label, labelHi, String(value), value, unit, source, sourceNote)]);
}

/** Sum the top-level values of a set of steps — used by every cost block. */
export function sumSteps(steps: TraceStep[]): number {
  return steps.reduce((acc, s) => acc + s.value, 0);
}

/** Depth-first flatten, for tables and "view as text" alternatives. */
export function flattenTrace(steps: TraceStep[], depth = 0): { step: TraceStep; depth: number }[] {
  const out: { step: TraceStep; depth: number }[] = [];
  for (const s of steps) {
    out.push({ step: s, depth });
    if (s.children?.length) out.push(...flattenTrace(s.children, depth + 1));
  }
  return out;
}

/** Merge assumption lists, keeping the first occurrence of each key. */
export function mergeAssumptions(...lists: Assumption[][]): Assumption[] {
  const seen = new Map<string, Assumption>();
  for (const list of lists) {
    for (const a of list) if (!seen.has(a.key)) seen.set(a.key, a);
  }
  return [...seen.values()];
}

/** Attach a basis chip to a step. */
export function withBasis(s: TraceStep, basis: string): TraceStep {
  return { ...s, basis };
}
