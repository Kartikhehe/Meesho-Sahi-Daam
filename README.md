# सही दाम · Sahi Daam

**A price operating system for new-to-online Meesho sellers.**

Every marketplace tells a seller the price that will **win**. None tells her the price that lets her
**survive**. And for some products no price does either — the cost floor sits above the visibility
ceiling, and the only honest advice is *"don't list this yet."* No pricing tool says that. This one
does.

---

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That is the whole setup — **no database, no API keys, no environment
variables, no network calls at runtime.** It runs on a laptop with the wifi switched off.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run build` | Production build (must be clean) |
| `npm run verify` | **Reproduce every reference number in a plain Node process** |
| `npm run generate` | Regenerate `data/world.json` from the seed |
| `npm run typecheck` | `tsc --noEmit` |

`npm run verify` is the one to run first. It proves the arithmetic without a browser:

```
✓ all 55 checks passed
```

---

## The problem

A seller who has run a cloth shop for fifteen years lists her first kurti at ₹305. Her arithmetic:

```
₹305 price − ₹180 goods − ₹65 shipping − ₹8 packing = ₹52 earned
```

What actually happens, per parcel **dispatched**:

| | ₹ |
|---|---|
| What she thinks she earns | **+52.0** |
| Lost to refused and returned parcels | −51.1 |
| Shipping refunded on refused parcels | +11.1 |
| Return shipping | −25.4 |
| 18% GST on those platform fees | −14.3 |
| Ads | −15.2 |
| **What actually reaches her** | **−43.0** |

A **₹95 gap — 31% of the list price** — and she does not discover it for 15 to 25 days, when the
settlement file arrives.

### The three pillars

| Pillar | What it is |
|---|---|
| **The Floor** | Survival price — true break-even per dispatched order, computed from platform data rather than typed in |
| **The Ladder** | Cold-start discovery — borrow the demand curve from look-alike listings, then test three live price rungs |
| **The Clock** | Six lifecycle stages and six event triggers that move the price as costs and rivals move |

### The core equation

```
                  COGS on units that sell
                + COGS written down on goods that came back
                + forward freight, net of RTO reversals
                + reverse freight on failed parcels
                + 18% GST on those platform fees
                + packaging
SurvivalPrice = ────────────────────────────────────────────
                        paidFraction − adSpendRate
```

where `paidFraction = (1 − rtoRate) × (1 − returnRate)`.

The ad rate sits in the **denominator**, not the numerator, because ad spend is a percentage of
price: raise the price and the ad cost rises with it. Putting it in the numerator as a flat rupee
figure understates the floor, and is the most common way a naive implementation of this gets it
wrong.

---

## What is real, and what is simulated

This section matters more than any feature list. Be suspicious of a prototype that will not tell you
this.

### Real

- **All of the arithmetic.** The cost model, the ceiling estimator, the band classifier, the demand
  model, the twin retriever (genuine cosine similarity over an attribute vector), the price-ladder
  bandit (Thompson sampling with a Beta posterior), the six trigger evaluators, the lifecycle state
  machine and the clock are ordinary TypeScript in `/engine`, with **no React imports and no browser
  globals**. `npm run verify` executes them in Node and checks 55 assertions.
- **Every number on every screen.** Nothing is hardcoded in a component. If a figure appears in the
  UI it came from the engine, and it carries its own derivation — tap any underlined number.
- **The emergent behaviour.** The three archetype failures are not special-cased. `grep -rniE
  "imran|suresh|rekha" engine/` returns only a comment explaining why no such branch exists.

### Simulated

- **The world.** Six sellers, 60 design clusters, 355 listings, ~1,900 competing listings and 18
  months of daily orders, all generated deterministically from **seed 230540**.

**Why simulated rather than scraped:** public product datasets carry names, prices, ratings and
review counts. None of them carry **cost of goods, settlement lines, RTO or return outcomes** —
which are exactly the fields this product reasons about. Nobody publishes per-order settlement
ledgers, and nobody will. Presenting a scraped catalogue as though it contained that data would be
dishonest; simulating it from published benchmarks, and saying so, is not.

Every simulation parameter carries its source in `engine/constants.ts` and is rendered as a table at
**Admin → Data Provenance**, flagged as either a published benchmark or our own assumption. A CSV
adapter in `data/import/` maps a real catalogue file onto the same types, so genuine data can be
dropped in without the engine changing.

### Where the model is calibrated, and where it differs

- The emergent refused-parcel rate is **16.98%**, against a published national average of ~23%. The
  model is deliberately tuned *below* the benchmark so the case it makes stays conservative.
- The brief's second reference floor (₹313) could not be reproduced exactly; the engine gives
  ₹311.5. The formula is exact on the first reference case (₹375.0) and on every line of the
  waterfall (−₹43.0), so this looks like a small inconsistency in that one figure rather than in the
  formula. `PROGRESS.md` has the full reconciliation.

---

## Architecture

```
/engine      pure TypeScript — no React, no browser globals, fully unit-tested
/data        the generated world, its generator, and the CSV import adapter
/lib         selectors, formatters, access control, i18n, stores
/components  ui primitives, charts, shared (TraceDrawer, MoneyValue, …)
/app         routes, grouped by role
/content     glossary, tactics, story script
/scripts     verify.ts, generate-world.ts
```

Three decisions shape everything else:

**1. The engine is pure.** It cannot read `localStorage` or a store; state flows in as arguments.
That is what makes `scripts/verify.ts` able to prove the reference numbers without a browser.

**2. `Traced<T>` is the universal return type.** Every engine function that produces a number a
human will see returns `{ value, trace, assumptions }` rather than a bare number. A number and its
explanation are computed in one pass from the same intermediates, so they **cannot drift apart**.
The UI renders `<MoneyValue traced={…} />`, which is tappable and opens the one `<TraceDrawer />`.

**3. Access control lives in one module.** Nothing checks `role === "admin"` inline; everything asks
`can()` in `lib/access.ts`. That is what makes the Category Manager rule — cost data in aggregate,
and a drill-in to one seller is audited — enforceable in a single place.

---

## What to look at

| Screen | Why |
|---|---|
| `/dev/charts` | The Daam Meter in all five states. The inverted "no viable price" case is the product's best idea. |
| `/dev/trace` | Tap any number to see its full derivation. |
| `/sku/sku-imran-071` | A listing priced ₹344 against a ₹427 floor, losing ₹5,224/month — and exactly why. |
| `/new-listing` | Enter ₹175 goods and 900g for a kurti to reach the **DON'T LIST** verdict. |
| `/clusters` | 24 of 60 designs have no viable band for the median seller. That is a marketplace cost-structure finding, not a seller-education one. |
| `/provenance` | Every parameter, its value and its source. |
| `/story` | Nine steps through the real product. Esc exits at any point. |

Switch roles and sellers from the top bar.

---

## Deliberately not built

No chatbot or "AI assistant" — there is no LLM anywhere in this product, and every intelligence in
it is explicit arithmetic a seller can inspect. A chat box would undermine the entire trust premise.
Also absent: vanity analytics with no decision attached, fake notification badges, auto-applied
prices without opt-in, any hard block on listing or pricing, and any way for one seller to infer
another's costs.

---

## Docs

- [`PLAN.md`](PLAN.md) — architecture decisions, written before any code
- [`PROGRESS.md`](PROGRESS.md) — phase-by-phase log, including every calibration decision and the
  bugs found while verifying
- [`docs/ENGINE.md`](docs/ENGINE.md) — every formula with its derivation
- [`docs/DATA.md`](docs/DATA.md) — every simulation parameter and its source
