/**
 * Seeded pseudo-random number generation.
 *
 * The entire world is reproducible from a single seed. That is not a
 * convenience — it is what lets the clock be re-run, the charts be trusted, and
 * a bug be reproduced. Every stochastic draw in the simulation comes from here,
 * and nothing anywhere calls Math.random().
 *
 * mulberry32: small, fast, good enough distribution for a simulation, and
 * trivially portable so the same seed gives the same world on any machine.
 */

export type Rng = () => number;

/** Create a generator from a numeric seed. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a stable sub-seed from a string key. Used so that a listing's draws
 * depend on its id and the day, not on call order — which means adding a new
 * listing never perturbs the history of an existing one.
 */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261 >>> 0;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A generator keyed by a set of parts — deterministic and order-independent. */
export function rngFor(...parts: (string | number)[]): Rng {
  return makeRng(hashSeed(...parts));
}

// --- distributions --------------------------------------------------------

/** Uniform in [min, max). */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Integer in [min, max] inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

/** Standard normal via Box-Muller. */
export function normal(rng: Rng, mean = 0, sd = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Lognormal — the right shape for daily order noise: never negative, mostly
 * clustered, with an occasional good day. Low variance by default so the
 * signal in the demand model is not drowned out.
 */
export function lognormal(rng: Rng, median = 1, sigma = 0.25): number {
  return median * Math.exp(normal(rng, 0, sigma));
}

/** Bernoulli trial. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

/** Pick one element uniformly. Returns undefined only for an empty array. */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/** Pick by weight. Weights need not sum to 1. */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T | undefined {
  const total = items.reduce((acc, t) => acc + weight(t), 0);
  if (total <= 0) return pick(rng, items);
  let r = rng() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

/** In-place-safe shuffle, returning a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Beta sampler, for the price-ladder bandit's posterior draws. Built from two
 * Gamma draws; Marsaglia-Tsang for the Gamma.
 */
export function gamma(rng: Rng, shape: number): number {
  if (shape < 1) {
    const u = rng();
    return gamma(rng, shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = normal(rng);
    const v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function beta(rng: Rng, alpha: number, betaParam: number): number {
  const a = gamma(rng, alpha);
  const b = gamma(rng, betaParam);
  return a / (a + b);
}
