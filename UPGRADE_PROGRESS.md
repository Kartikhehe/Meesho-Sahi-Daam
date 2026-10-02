# UPGRADE_PROGRESS.md — Round-2

**Resume point.** Read this, then `UPGRADE_PLAN.md`.

| | |
|---|---|
| **Phase in progress** | Phase 5 — regimes: REGIME SHIFT trigger, product-type lifecycle, 2×2 map, admin params |
| **Next file to touch** | `engine/triggers.ts` (7th trigger), then `engine/lifecycle.ts` |
| **Known breakage** | None. Build clean; `npm run verify` → 86/86 |

## Phases

- [x] **1 · Golden numbers** — every figure in deck §1 is an engine test and passes.
- [x] **2 · Band rule** — `[floor·(1+m), ceiling]`, four launch verdicts, profit-max suggestion everywhere
- [x] **3 · Day-zero data** — fallback ladder, credibility blending, floor range + narrowing chart, buyer-side RTO, basis chips
- [x] **4 · Six hard cases** — cost ladder + mock bill reader, no-twins prior, "My cost is different" (audited), Meesho-only note, Hindi voice, plausibility nudge
- [ ] 5 · Regimes, REGIME SHIFT trigger, product-type lifecycle, chips, 2×2 map
- [ ] 6 · Trust ladder + Auto-Pilot
- [ ] 7 · Manager and Admin additions
- [ ] 8 · Personas + Story Mode
- [ ] 9 · Polish, README, clean build

## Phase 1 notes

- **Cost model replaced** with the deck's (see the table in `UPGRADE_PLAN.md`). New: `engine/launch.ts`
  (monthly contribution, profit-max price), `engine/uncertainty.ts` (floor band, P(floor > price)),
  `engine/reference.ts` (the worked kurti, one definition), `priorOrdersPerDay` in `engine/demand.ts`.
- **The day-zero band is derived, not typed.** Prior SDs (returns 4.2 pts, COD refusals 2.1 pts) are
  propagated through the floor by the delta method and shrunk by √(30/(n+30)); that reproduces
  ±28/20/14/9 and the 85%.
- **World regenerated.** Emergent RTO 17.3% (deck: 17%).
- **Carried to Phase 8:** under the new model Rekha classifies as `matcher` (70% of her listings below
  floor) rather than set-and-forgetter, and Imran's catalogue loses −₹65k/month against the deck's
  −₹47.5k. Phase 8 seeds the deck's exact persona price points; re-check both there.
- `RETURN_WRITEDOWN` is now derived as 1 − ρ = 0.17, so existing callers stay correct.

## Phase 2 notes

- `classifyBand` takes a margin (default `BAND_MARGIN` 3%) and returns `bandLow` and a `launch` verdict
  (DONT_LIST / DIFFERENTIATE / PROFIT_MAX / PRICE_FOR_MARGIN) by width as a share of the ceiling.
- Every "we suggest" is now the argmax of expected monthly contribution inside the band
  (`bestPriceInBand` for listings, `profitMaxPrice` for a demand prior). Clusters may carry a measured
  `demandPrior`; when present, demand uses it everywhere.
- **Done early, from Phase 4** (they live in the same wizard code): the New Listing wizard was split
  into `lib/new-listing-market.ts` + step components. It now has the no-twins category prior with a
  ±10% range and NEW / THIN tag (new `dupatta` category has no clusters by design), the day-zero floor
  range with "N% likely no viable price", the "I'm not sure" cost ladder, a labelled mock bill reader,
  the plausibility nudge, the Hindi voice preview and the Meesho-only note.
- DON'T LIST now names the lever that moves the floor *most* at a realistic move (`components/listing/levers.ts`),
  and says whether it alone is enough.

## Phases 3–4 notes

- `engine/priors.ts`: returns fall back own → design cluster → category → platform (first level with ≥100
  parcels); RTO is buyer-side (pincode tier × payment mode) at her COD mix. Both blended with her own by
  K = 30, and each carries a trace showing n, prior level and the blend.
- The **UI** analysis (`lib/selectors.ts → costInputsBlended`) uses blended rates; the **clock** keeps the
  faster constant-rate inputs for its daily simulation. They agree closely (both centre on the same
  rates) but are not identical — documented rather than hidden.
- Every trace row now carries a basis chip: SELLER / SELLER · custom / MEESHO · exact / MEESHO · prior: …, n=… / Statutory.
- `lib/store/config-store.ts` holds margin, K, band confidence, regime thresholds, kill switch and the
  admin's price lever; `lib/use-seller.ts` turns them into the options every analysis uses.
- The BPI guardrail is real now: `lib/guardrails.ts` computes it from listed prices, and a breach holds
  back every upward suggestion in `analyseListing`.
- `engine/regime.ts` (written early, needed by the config store): credible rival = 4.0★+ with ≥ 2.5% of
  orders; crowded at ≥ 10; dispersed at price CV ≥ 3%. Regime chips are on catalogue rows and SKU detail.
