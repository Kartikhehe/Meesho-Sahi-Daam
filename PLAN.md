# PLAN.md — Sahi Daam

A price operating system for new-to-online Meesho sellers. Written before any code.

---

## 1. What this is

A fully working product prototype where **every number on screen is computed by real code from a
real (simulated) data model**, and every computed number is traceable back to its inputs through
the UI.

No backend. No database. No network calls at runtime. `npm install && npm run dev` on a laptop with
no internet.

---

## 2. Core architectural decisions (and why)

### D1 — The engine is pure TypeScript, zero React

`/engine` imports nothing from React, Next, or the browser. It is importable from a plain Node
script. This is not stylistic: it is what makes `scripts/verify.ts` able to prove the reference
numbers (₹375 / ₹313 / −₹42.9) without a browser, and what makes Vitest coverage meaningful.

**Consequence:** the engine cannot read `localStorage` or Zustand. State flows *in* as arguments.
The React layer owns state; the engine owns arithmetic.

### D2 — `Traced<T>` is the engine's universal return type

Every engine function that produces a number a human will see returns
`{ value, trace, assumptions }` rather than a bare number.

```ts
export type Traced<T> = { value: T; trace: TraceStep[]; assumptions: Assumption[] };
```

This is the single most important decision in the build. The product's promise is "हिसाब देखें —
see the maths". If traces were a separate, optional call, they would drift from the numbers they
explain. By making the trace *part of the return value*, a number and its explanation cannot
disagree — they are computed in one pass, from the same intermediates.

**Consequence:** the UI never formats a raw number. It renders `<MoneyValue traced={...} />`, which
is tappable and opens the one `<TraceDrawer />`. A number without a trace is a bug, not a style
choice.

**Cost accepted:** engine functions are more verbose. Worth it.

### D3 — Deterministic seeded world simulation, not scraped data

Public Meesho/Indian-fashion datasets have product name, MRP, selling price, rating — and **no
cost, settlement, RTO, or return data**, which is exactly what this product needs. Per-order
settlement ledgers are not published by anyone and never will be.

So: a seeded (seed `230540`), parameterised world simulator whose parameters come from published
benchmarks, each with a source comment in `/engine/constants.ts`, rendered in Admin → Data
Provenance so a viewer can inspect it.

Two guards against this reading as fake:
1. Every constant carries a `source` and an `isBenchmark | isAssumption` flag, surfaced in the UI.
2. `/data/import/` ships a CSV adapter mapping a real catalogue CSV onto internal types, plus a
   sample CSV so the path is exercised. Real data can be dropped in later without touching the
   engine.

### D4 — Archetype failures must *emerge*, never be special-cased

Imran's ~₹47.5k/month loss, Suresh's near-zero orders, Rekha's drifted floors — all three come out
of the demand model and cost model running on their catalogues. There is no
`if (seller === 'imran')` anywhere in the codebase. If the numbers don't land, the *parameters* get
tuned, not the logic. This is checked by `scripts/verify.ts`.

### D5 — Ad rate goes in the denominator

```
SurvivalPrice = (cogsOnSold + cogsLostOnDamaged + netForwardFreight + reverseFreight
                 + gstOnFees + packaging) / (paidFraction − adSpendRate)
```

Ad spend is a *percentage of price*: raise the price and ad cost rises with it. Putting it in the
numerator (as a flat rupee figure) understates the floor. This is the heart of the product and the
most common way a naive implementation gets it wrong.

`paidFraction = (1 − rtoRate) × (1 − returnRate)`

### D6 — Access control in one module, not scattered `if`s

`lib/access.ts` exports `can(role, capability, subject?)`. Routes and components ask it. Nothing
checks `role === 'admin'` inline. This makes the role boundaries auditable and makes the Category
Manager's "cost data only in aggregate, drill-in is audited" rule enforceable in one place.

### D7 — Small files, phase-gated commits

No file over ~300 lines. Each of the 10 phases ends with a building, running app and a commit.
A crash mid-write to a 2000-line file is the main way a build like this dies.

---

## 3. File tree

```
/app
  layout.tsx                      root shell, theme, fonts
  page.tsx                        redirect → role home
  error.tsx  not-found.tsx  global-error.tsx
  /(seller)
    /home                         S1  आज का हिसाब
    /catalogue                    S2
    /sku/[id]                     S3  tabs: price|cost|market|history|experiment
    /new-listing                  S4  4-step wizard
    /unlock                       S5  cost unlock simulator
    /alerts                       S6
    /settlements                  S7
    /learn                        S8
  /(manager)
    /cohort /sellers /clusters /experiment /queue      M1–M5
  /(admin)
    /engine-config /triggers /guardrails /rollout
    /simulation /provenance /audit                     A1–A7
  /story                          9-step guided walkthrough
  /dev/charts                     internal chart gallery (all states)

/components
  /ui          button card input select slider tabs table drawer chip skeleton toggle ...
  /charts      DaamMeter Waterfall LeakageFunnel PriceProfitCurve + recharts wrappers
  /shared      TraceDrawer MoneyValue StatusChip EmptyState MetricCard DataTable ComingSoon
  /layout      Sidebar TopBar RoleSwitcher ThemeToggle DemoBar BottomTabs

/engine                           PURE — no React, no browser globals
  types.ts          TraceStep Traced Assumption Listing DesignCluster Seller Order Settlement
  constants.ts      every parameter + source comment + benchmark|assumption flag
  rng.ts            seeded mulberry32 + helpers (normal, lognormal, choice)
  money.ts          rupee rounding, psychological price snapping
  cost.ts           cost-to-serve solver → Traced<SurvivalPrice>
  ceiling.ts        order-weighted 85th percentile ceiling estimator
  band.ts           band classification incl. inverted (floor > ceiling) case
  waterfall.ts      belief vs reality unit economics
  demand.ts         clusterDemand priceShare visibilityGate ratingFactor stockFactor
  twins.ts          cosine similarity over attribute vectors
  bandit.ts         Thompson sampling, 3 arms, Beta posterior, −5% loss cap
  triggers/         six pure evaluators + ranking + weekly cap
  lifecycle.ts      S0→S5 state machine
  clock.ts          advanceDays(n) — orders, settlements, drift, triggers, stages, ladders
  score.ts          Daam Score 0–100

/data
  world.json                      generated
  /generator                      sellers clusters listings history
  /import                         csv adapter + sample.csv

/lib          format.ts i18n.ts storage.ts access.ts audit.ts store/ (zustand)
/content      glossary.ts copy.ts story.ts
/scripts      verify.ts generate-world.ts
/docs         ENGINE.md DATA.md
```

---

## 4. Engine type signatures (the contract)

```ts
// --- trace ---
type Unit = 'INR' | 'PCT' | 'RATIO' | 'COUNT';
type Source = 'seller_input' | 'platform_ledger' | 'cluster_model' | 'benchmark' | 'derived';

type TraceStep = {
  label: string; labelHi: string; formula: string;
  value: number; unit: Unit; source: Source;
  sourceNote?: string; children?: TraceStep[];
};
type Assumption = { key: string; label: string; value: number; unit: Unit; source: Source; note: string };
type Traced<T> = { value: T; trace: TraceStep[]; assumptions: Assumption[] };

// --- cost ---
type CostInputs = {
  cogs: number; rtoRate: number; returnRate: number; adSpendRate: number;
  forwardFreight: number; reverseFreight: number; packaging: number;
  returnWritedown: number; gstOnFees: number;
};
function survivalPrice(i: CostInputs): Traced<number>;
function paidFraction(rto: number, ret: number): Traced<number>;
function contributionPerOrder(price: number, i: CostInputs): Traced<number>;

// --- market ---
function estimateCeiling(cluster: DesignCluster, day: number): Traced<number>;
function classifyBand(floor: number, ceiling: number, price: number): Traced<BandVerdict>;
//   BandVerdict = 'BELOW_FLOOR'|'THIN'|'HEALTHY'|'ABOVE_GATE'|'NO_BAND'

// --- demand ---
function ordersPerDay(l: Listing, c: DesignCluster, day: number, rng: Rng): Traced<number>;
function visibilityGate(price: number, ceiling: number): number;
function priceShare(l: Listing, c: DesignCluster): number;

// --- discovery ---
function findTwins(seed: AttributeVector, pool: Listing[], k: number): Traced<Twin[]>;
function nextArm(state: BanditState, rng: Rng): Traced<ArmId>;
function updatePosterior(state: BanditState, arm: ArmId, converted: boolean, rupees: number): BanditState;

// --- time ---
function evaluateTriggers(ctx: TriggerContext): FiredTrigger[];   // ranked, capped 2/week
function advanceStage(l: Listing, day: number): LifecycleStage;
function advanceDays(world: World, n: number): World;             // pure: returns new world
```

---

## 5. The four signature visualisations

Hand-written SVG (not Recharts), responsive, themed from CSS variables, `<title>`/`<desc>` on each,
"view as table" toggle, `prefers-reduced-motion` respected.

1. **Daam Meter** — rail from `floor×0.85` to `ceiling×1.15`. Red below floor, green floor→ceiling,
   grey above. Markers: floor, ceiling, current (dot), recommended (ring). **When `floor > ceiling`
   the geometry inverts into a hatched "no viable price" band** — this state gets the most design
   attention, because it is the product's best idea.
2. **Unit-economics waterfall** — ₹52 belief → −₹43 reality, connector lines, running subtotal,
   hover trace, "believes / reality" bracket.
3. **Leakage funnel** — 100 dispatched → 83 delivered → 66.4 paid, widths proportional, cost per
   stage beneath.
4. **Price–profit–volume curve** — X price, left Y orders/month, right Y contribution ₹/month.
   Rules at floor, ceiling, current, recommended. Computed from the demand model.

---

## 6. Design posture

Meesho's consumer app is vibrant. **The supplier panel is not, and ours must not be.** This is a
tool a woman opens at 6am to decide whether she can afford to sell a kurti. Calm, trustworthy,
quiet.

- Brand (Jamuni `#570D45`, Magenta `#F43397`, Aam `#FFC130`) → **chrome and primary actions only,
  never data encoding**. Data uses the semantic scale (danger/warning/success/info/neutral).
- Inter + Noto Sans Devanagari. Tabular figures on every number.
- One elevation level. 8px grid. Max one magenta button per screen.
- Hindi first on seller screens, English underneath, smaller.
- Rupees, not percentages: "You lose ₹43 on every order", never "margin is −4.2%".
- Advisory, never commanding: "We suggest ₹334", never "Set price to ₹334". Never block an action.
- Dark mode required.

---

## 7. Phase checklist

| # | Phase | Gate |
|---|---|---|
| 1 | Skeleton that never breaks | Every nav item clicks; nothing 404s or white-screens |
| 2 | Engine, headless | `npx tsx scripts/verify.ts` reproduces every reference number |
| 3 | World generation + persistence | Regenerate world, advance 30 days, JSON changes |
| 4 | Trace system + shared components | A survival price whose drawer shows full derivation |
| 5 | Four signature charts | All render at 360/768/1440, light and dark |
| 6 | Seller experience | Open Imran's catalogue, find below-floor SKU, trace why |
| 7 | Decision flows | Walk Farida zero→listed; hit a genuine DON'T LIST verdict |
| 8 | Manager and Admin | Roles change reachability; config change shows blast radius + audit |
| 9 | Story Mode | 9 steps, no dead ends, `Esc` exits cleanly |
| 10 | Polish and hardening | Build clean, Lighthouse perf ≥90 / a11y ≥95 |

After every phase: `npm run build` → fix → `git add -A && git commit` → update `PROGRESS.md`.

---

## 8. Risks and their mitigations

| Risk | Mitigation |
|---|---|
| Session interrupted mid-build | Phase gates + `PROGRESS.md` as the single resume point |
| `shadcn` CLI fails | Hand-roll the same primitives in `components/ui/` with Tailwind; record in PROGRESS |
| Recharts misbehaves | Render that chart as hand-written SVG; record the substitution |
| Demand model doesn't reproduce the archetypes | Tune *parameters* in `constants.ts`; never special-case a seller |
| Numbers drift from their explanations | `Traced<T>` makes that structurally impossible |
| A broken chart kills a page | Error boundary per page; three states on every component |
