# PROGRESS.md — Sahi Daam

**This file is the resume point.** If the session ends, read this file alone to pick up correctly.

Last updated: Phase 0 (planning) complete.

---

## Current state

| | |
|---|---|
| **Phase in progress** | Phase 1 — Skeleton that never breaks |
| **Next file to touch** | `package.json` (scaffold Next.js 15) |
| **Known breakage** | None — nothing built yet |
| **Build status** | N/A — not yet scaffolded |

---

## Phase checklist

- [ ] **Phase 1 — Skeleton that never breaks**
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

---

## Ambiguities resolved (chose the more honest / more inspectable option)

*(none yet)*
