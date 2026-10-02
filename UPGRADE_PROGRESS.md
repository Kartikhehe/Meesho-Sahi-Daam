# UPGRADE_PROGRESS.md — Round-2

**Resume point.** Read this, then `UPGRADE_PLAN.md`.

| | |
|---|---|
| **Phase in progress** | Phase 6 — trust ladder + Auto-Pilot (store state exists; no screen yet) |
| **Next file to touch** | `app/(seller)/autopilot/page.tsx` (new), then the M3 regime 2×2 map |
| **Known breakage** | None. Build clean; `npm run verify` → 86/86. Deployed. |

## Phases

- [x] **1 · Golden numbers** — every figure in deck §1 is an engine test and passes.
- [x] **2 · Band rule** — `[floor·(1+m), ceiling]`, four launch verdicts, profit-max suggestion everywhere
- [x] **3 · Day-zero data** — fallback ladder, credibility blending, floor range + narrowing chart, buyer-side RTO, basis chips
- [x] **4 · Six hard cases** — cost ladder + mock bill reader, no-twins prior, "My cost is different" (audited), Meesho-only note, Hindi voice, plausibility nudge
- [~] **5 · Regimes** — classifier, chips, REGIME SHIFT trigger, trend/seasonal lifecycles done. **Left:** 2×2 regime map on M3; regime tempo driving ladder width.
- [ ] 6 · Trust ladder + Auto-Pilot — accept counts and Auto-Pilot move log are in the seller store; the screen is not built
- [~] 7 · Manager and Admin — BPI lever is real (Guardrails). **Left:** Admin model-settings screen (m, K, confidence, regime thresholds — the config store already holds them), kill-criteria panel, regime distribution
- [~] **8 · Personas** done — the deck's reference kurti lives in the world (Imran ₹299 → −₹45.97/parcel, −₹46.3k/month; Suresh ₹449 → 0 orders; Anita's re-sourced kurti runs a price ladder), Farida sells zari dupattas, Rekha's costs move under a slab re-card and the monsoon. **Left:** rewrite Story Mode to the deck's nine steps.
- [~] 9 · README Round-2 section, clean build, deployed. **Left:** 360 px pass on the new screens.

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

## Phase 5 / 8 notes

- `engine/environment.ts`: a dated, slab-specific freight re-card (501–1000 g, ×1.12, three weeks before
  "today") and a July–September monsoon return multiplier (×1.25). The clock and the floor both use them,
  and COST_DRIFT now receives the band as it stood 30 days earlier — before this it could never fire.
- The clock now steps running price ladders daily (Thompson sampling, 100 shows a day), and enforces the
  5% loss cap only after every rung has had a week of shows — judged earlier, the cap halted on day one.
- Listings no longer sell before their listing day; trend SKUs exit after ~10 weeks; seasonal SKUs listed
  in the festive run-up have their exit pre-scheduled at season end.
- `data/generator/reference.ts`: the reference cluster's rivals are held still (`stable`) so its ceiling
  stays ₹352 and the deck's numbers stay reproducible; its listings carry measured rates.
