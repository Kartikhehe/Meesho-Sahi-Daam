/**
 * The worked SKU from the Round-2 deck — a kurti, before and after its unlocks.
 *
 * One definition, used by the golden-number tests, the dev gallery and Story
 * Mode, so the deck and the app can never quietly disagree.
 */

import type { CostInputs } from "./cost";
import type { DemandPrior } from "./demand";
import { rtoForCodShare } from "./uncertainty";

export const REFERENCE_CEILING = 352;

export const REFERENCE_BEFORE: CostInputs = {
  cogs: 180,
  rtoRate: rtoForCodShare(0.8), // 20% COD / 5% prepaid at 80% COD → 17%
  returnRate: 0.2,
  adSpendRate: 0.05,
  forwardFreight: 65,
  reverseFreight: 153,
  packaging: 8,
};

/** After the three unlocks: COGS 180→158, returns 20→13%, COD 80→55%. */
export const REFERENCE_AFTER: CostInputs = {
  ...REFERENCE_BEFORE,
  cogs: 158,
  returnRate: 0.13,
  rtoRate: rtoForCodShare(0.55),
};

/** The twins' demand prior for this design. */
export const REFERENCE_DEMAND: DemandPrior = {
  q0: 29.6,
  pRef: 329,
  elasticity: 2.8,
  gateCentre: 329,
  gateWidth: 14.3,
};
