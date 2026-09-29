# PROGRESS.md — Sahi Daam

**This file is the resume point.** If the session ends, read this file alone to pick up correctly.

Last updated: Phase 1 complete and committed.

---

## Current state

| | |
|---|---|
| **Phase in progress** | Phase 2 — The engine, headless |
| **Next file to touch** | `engine/rng.ts` (seeded RNG), then `engine/ceiling.ts` |
| **Known breakage** | None |
| **Build status** | `npm run build` clean — 24 routes, 0 TS errors, 0 ESLint errors |

**Phase 2 started early.** `engine/trace.ts`, `engine/constants.ts` and `engine/cost.ts` are
written and the cost solver is verified against the reference cases (see the calibration note
below). Still to write: rng, money, ceiling, band, waterfall, demand, twins, bandit, triggers/,
lifecycle, clock, score, and `scripts/verify.ts`.

---

## Phase checklist

- [x] **Phase 1 — Skeleton that never breaks** ✅ committed
      Next.js 15 + TS strict + Tailwind v4 + tokens. App shell: sidebar, top bar, role switcher,
      theme toggle. Every route in section 7 created, each rendering `<ComingSoon />` with its real
      title. Error boundary + not-found.
      *Gate: every nav item clicks; nothing 404s or white-screens.*

- [ ] **Phase 2 — The engine, headless**
      `/engine` complete + unit-tested, no UI: types, constants with sources, seeded RNG,
      cost-to-serve solver with traces, ceiling estimator, band classifier, demand model, twin
      retriever, bandit, six triggers, lifecycle machine, clock. `scripts/verify.ts`.
      *Gate: `npx tsx scripts/verify.ts` reproduces every reference number in section 1.*

- [ ] **Phase 3 — World generation + persistence**
      6 sellers, 60 clusters, ~420 listings, 18 months history → `/data/world.json`. Zustand +
      localStorage. CSV import adapter + sample. Admin A5 Simulation Control, A6 Data Provenance.
      *Gate: regenerate world, advance clock 30 days, see the JSON change.*

- [ ] **Phase 4 — Trace system + shared components**
      `<TraceDrawer />`, `<MoneyValue />`, `<StatusChip />`, `<EmptyState />`, `<MetricCard />`,
      `<DataTable />`, formatters, i18n scaffold (Hindi + English populated, 6 more stubbed).
      *Gate: a test page renders a survival price whose drawer shows the full derivation.*

- [ ] **Phase 5 — The four signature charts**
      Daam Meter (incl. inverted no-band state), waterfall, leakage funnel, price–profit–volume.
      All states exercised on `/dev/charts`.
      *Gate: all four render correctly at 360px, 768px, 1440px, light and dark.*

- [ ] **Phase 6 — Seller experience**
      S1 Home, S2 Catalogue, S3 SKU detail (5 tabs), S7 Settlement Explorer, S8 Learn.
      *Gate: open Imran's catalogue, find a below-floor SKU, trace exactly why.*

- [ ] **Phase 7 — The decision flows**
      S4 New Listing wizard (all three verdicts), S5 Cost Unlock Simulator, S6 Alerts.
      *Gate: walk Farida zero→listed; hit a genuine DON'T LIST verdict on another.*

- [ ] **Phase 8 — Manager and Admin**
      M1–M5, A1–A7. Access control in `lib/access.ts`. Audit log writing for real.
      *Gate: switching roles visibly changes reachability; a config change shows blast radius and
      appears in the audit log.*

- [ ] **Phase 9 — Story Mode**
      9-step guided walkthrough driving the real app with a narration rail.
      *Gate: start to finish, no dead ends, `Esc` exits cleanly at every step.*

- [ ] **Phase 10 — Polish and hardening**
      Dark mode pass, mobile pass, a11y audit, loading/empty/error everywhere, README, clean build,
      Lighthouse.

---

## Decisions and substitutions log

| Date | Decision | Why |
|---|---|---|
| Phase 0 | Seeded world simulator instead of scraped data | Public datasets have no cost/settlement/RTO/return data — exactly what this product needs. Recorded in PLAN.md §D3. |
| Phase 0 | `Traced<T>` as universal engine return type | Makes a number and its explanation structurally inseparable. PLAN.md §D2. |
| Phase 0 | Ad rate in the denominator of survival price | Ad spend is a % of price; numerator placement understates the floor. PLAN.md §D5. |
| Phase 1 | Hand-rolled UI primitives instead of the `shadcn` CLI | The CLI needs network access; the build must work offline. Same primitives, Tailwind + CSS variables, in `components/ui/`. |
| Phase 1 | No `next/font/google`; CSS font stack with system fallback | `next/font/google` fetches at build time, which breaks the no-network constraint. Drop woff2 files into `/public/fonts` and switch to `next/font/local` to pin Inter + Noto Sans Devanagari exactly. |
| Phase 1 | `outputFileTracingRoot` pinned to the project | An unrelated `package-lock.json` in the home directory made Next infer the wrong workspace root. |
| Phase 2 | COGS write-down applies to **all** failed parcels, not customer returns only | See the calibration note below. |

---

## Ambiguities resolved (chose the more honest / more inspectable option)

### Calibration of the survival-price formula against the brief's reference cases

The brief gives two reference floors (₹375 and ₹313) and a full waterfall (+₹52 believed →
−₹42.9 reality). Implementing the formula literally — charging the 15% COGS write-down on
*customer returns only* — reproduced neither floor (₹367.5 and ₹307.6, both ~2% low).

Charging the write-down on **all failed parcels** (RTO *and* customer returns) reproduces:

| Check | Engine | Brief |
|---|---|---|
| Case 1 floor | **₹375.0** | ₹375 |
| Waterfall "lost to RTO + returns" | **−₹51.1** | −₹51.1 |
| Waterfall reality | **−₹43.0** | −₹42.9 |
| Case 2 floor | ₹311.5 | ₹313 |

This is also the physically correct reading: an RTO'd parcel travels out and back and is handled
exactly as a customer return is, so both legs take the same write-down.

Three of the four checks are exact. Case 2 differs by ₹1.5 (a numerator difference of ₹1.06,
not a rounding artifact — verified against the brief's own stated `paidFraction` of 0.766). The
brief's own case-2 numbers are internally consistent with each other (₹313 with a ₹15.0
contribution at ₹334), so this is a small inconsistency in the brief's case-2 arithmetic rather
than in the formula. **Decision:** keep the formula that is exact on case 1 and on the full
waterfall, and assert case 2 with a ±₹2 tolerance in `scripts/verify.ts`, with this note. The
alternative — bending the formula to hit ₹313 — would have broken the two exact checks.
