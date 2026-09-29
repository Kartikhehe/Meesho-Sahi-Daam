/**
 * Domain types for the simulated world.
 *
 * Pure type declarations — no runtime code, no imports beyond the trace types.
 * The CSV import adapter in /data/import maps a real product catalogue onto
 * DesignCluster and Listing, so real data can be dropped in later without the
 * engine changing.
 */

import type { Traced } from "./trace";

export type Category =
  | "kurti"
  | "saree"
  | "co-ord-set"
  | "bedsheet"
  | "kitchen-storage"
  | "phone-cover"
  | "jewellery-set";

/** How a seller prices, derived from behaviour — never assigned by hand. */
export type Archetype =
  | "shopkeeper" // ported offline prices, sits above the ceiling
  | "matcher" // undercuts every rival, sits below the floor
  | "set-and-forgetter" // priced once, never revisited
  | "healthy" // already prices inside the band
  | "cold-start" // no history yet
  | "mixed"; // some good, some bleeding

export type Seller = {
  id: string;
  name: string;
  businessName: string;
  city: string;
  /** Derived from pricing behaviour by engine/archetype.ts, not authored. */
  archetype: Archetype;
  /** Share of her orders paid cash on delivery. Drives her RTO rate. */
  codShare: number;
  adSpendRate: number;
  packagingCost: number;
  /** Day index she joined, relative to the simulation epoch. */
  joinedDay: number;
  /** A/B arm. Treated sellers see the tool's recommendations. */
  treatment: "treated" | "control";
};

/**
 * A design cluster is a set of near-identical competing listings — the unit
 * within which price competition actually happens. Ceilings are a property of
 * the cluster, not of a seller.
 */
export type DesignCluster = {
  id: string;
  name: string;
  category: Category;
  /** Baseline orders per day across the whole cluster, before seasonality. */
  baseDailyDemand: number;
  /** Softmax temperature on −elasticity × ln(price). */
  elasticity: number;
  attributes: AttributeVector;
};

/** The real attribute vector the twin retriever runs cosine similarity over. */
export type AttributeVector = {
  category: Category;
  fabric: string;
  weightBand: number; // grams, bucketed
  mrpBand: number; // rupees, bucketed
  colourFamily: string;
  occasion: string;
  sleeveType: string;
};

export type LifecycleStage = "S0_LIST" | "S1_DISCOVER" | "S2_CLIMB" | "S3_HARVEST" | "S4_DEFEND" | "S5_EXIT";

export type Listing = {
  id: string;
  sellerId: string;
  clusterId: string;
  name: string;
  category: Category;
  price: number;
  /** What the goods cost the seller. The one number she actually knows. */
  cogs: number;
  weightGrams: number;
  mrp: number;
  rating: number;
  ratingCount: number;
  inventory: number;
  /** Day the listing went live. */
  listedDay: number;
  stage: LifecycleStage;
  attributes: AttributeVector;
  /** Set when a price-ladder experiment is running on this listing. */
  experimentId?: string;
};

/** A rival listing. Public information only — never a cost or a floor. */
export type CompetitorListing = {
  id: string;
  clusterId: string;
  price: number;
  rating: number;
  /** Share of the cluster's orders this listing takes. */
  orderShare: number;
};

export type PaymentMode = "cod" | "prepaid";
export type OrderOutcome = "delivered" | "rto" | "returned";

export type OrderEvent = {
  id: string;
  listingId: string;
  day: number;
  price: number;
  paymentMode: PaymentMode;
  pincodeTier: 1 | 2 | 3 | 4;
  outcome: OrderOutcome;
};

/** One settlement line per order, credited SETTLEMENT_LAG_DAYS after dispatch. */
export type SettlementLine = {
  orderId: string;
  listingId: string;
  dispatchedDay: number;
  creditedDay: number;
  outcome: OrderOutcome;
  /** Gross sale value, zero when the parcel never paid. */
  saleValue: number;
  cogs: number;
  forwardFreight: number;
  /** Credited back on an RTO. */
  forwardFreightReversed: number;
  reverseFreight: number;
  adCost: number;
  gstOnFees: number;
  packaging: number;
  /** What actually lands in her bank for this parcel. */
  netCredit: number;
};

export type World = {
  seed: number;
  /** Current simulated day index. */
  day: number;
  sellers: Seller[];
  clusters: DesignCluster[];
  listings: Listing[];
  competitors: CompetitorListing[];
  orders: OrderEvent[];
  settlements: SettlementLine[];
  alerts: FiredTrigger[];
  experiments: LadderExperiment[];
  auditLog: AuditEntry[];
};

// --- band -----------------------------------------------------------------

export type BandVerdict =
  | "BELOW_FLOOR" // priced under her own break-even
  | "THIN" // inside the band, but with under 5% of room
  | "HEALTHY" // comfortably inside
  | "ABOVE_GATE" // above the ceiling: findable, but not found
  | "NO_BAND"; // floor above ceiling — no price works

export type BandAnalysis = {
  floor: number;
  ceiling: number;
  price: number;
  verdict: BandVerdict;
  /** Ceiling − floor. Negative when the band is inverted. */
  widthRupees: number;
  widthPct: number;
  recommended: number;
};

// --- triggers -------------------------------------------------------------

export type TriggerId =
  | "COST_DRIFT"
  | "RIVAL_UNDERCUT"
  | "RETURN_SPIKE"
  | "BELOW_FLOOR"
  | "STAGE_CHANGE"
  | "STOCK_RISK";

export type FiredTrigger = {
  id: string;
  triggerId: TriggerId;
  sellerId: string;
  listingId: string;
  day: number;
  severity: "low" | "medium" | "high";
  /** What it costs her per month. Alerts rank by this. */
  rupeeImpact: number;
  message: string;
  messageHi: string;
  trace: Traced<number>;
  /** True when the weekly cap suppressed it. Admin can inspect these. */
  muted: boolean;
  acknowledged?: boolean;
};

// --- experiments ----------------------------------------------------------

export type ArmId = 0 | 1 | 2;

export type ArmState = {
  arm: ArmId;
  multiplier: number;
  /** Beta posterior on conversion. */
  alpha: number;
  beta: number;
  orders: number;
  impressions: number;
  contribution: number;
};

export type LadderExperiment = {
  id: string;
  listingId: string;
  startedDay: number;
  basePrice: number;
  arms: ArmState[];
  /** Cumulative rupees given up while learning. Capped at 5%. */
  costOfLearning: number;
  status: "running" | "concluded" | "halted_by_cap";
  winningArm?: ArmId;
};

// --- audit ----------------------------------------------------------------

export type AuditEntry = {
  id: string;
  day: number;
  timestamp: number;
  actor: string;
  action: string;
  subject: string;
  before?: string;
  after?: string;
  /** "moves the floor for 41,200 listings by an average of ₹6.20" — computed. */
  blastRadius?: string;
};
