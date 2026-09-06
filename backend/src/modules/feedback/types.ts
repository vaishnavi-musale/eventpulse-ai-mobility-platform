// §20/§21/§30 — Feedback & Learning types

/**
 * §20 — Evidence taxonomy tiers.
 * S=simulated, O=observational, A=A/B, C=causal.
 */
export type EvidenceTier = "S" | "O" | "A" | "C";

/**
 * §20 — A reported outcome with enforced evidence tier.
 */
export interface ReportedOutcome {
  /** Unique outcome ID */
  id: string;
  /** Provider ID */
  providerRef: string;
  /** Event/zone reference */
  zoneRef: string;
  /** Evidence tier (S/O/A/C) */
  tier: EvidenceTier;
  /** Metric name (e.g., "fulfillment_rate", "response_time") */
  metric: string;
  /** Metric value */
  value: number;
  /** Sample size (for statistical validity) */
  sampleSize: number;
  /** Timestamp of observation */
  observedAt: Date;
  /** Whether this is from an A/B holdout */
  isHoldout: boolean;
  /** Additional context */
  context: Record<string, unknown>;
}

/**
 * §20.2 — Operating-as-experiment holdout.
 */
export interface HoldoutGroup {
  id: string;
  /** Fraction of traffic in holdout */
  holdoutFraction: number;
  /** Whether fairness guard is active */
  fairnessGuarded: boolean;
  /** Start timestamp */
  startedAt: Date;
  /** End timestamp (null if ongoing) */
  endedAt?: Date;
  /** Metrics collected */
  metrics: string[];
}

/**
 * §20.3 — Provider reputation state.
 */
export interface ProviderReputation {
  providerRef: string;
  /** Composite reputation score (0-1) */
  score: number;
  /** Number of attributed failures */
  failureCount: number;
  /** Number of platform-induced failures (not attributed to provider) */
  platformInducedFailures: number;
  /** Number of successful fulfillments */
  successCount: number;
  /** Whether the provider is gated from directed-flow priority */
  priorityGated: boolean;
  /** Last adjudication timestamp */
  lastAdjudicationAt?: Date;
}

/**
 * §20.3 — Failure adjudication result.
 */
export interface FailureAdjudication {
  providerRef: string;
  /** Whether failure was platform-induced (bad assignment/hoarding/dropped verification) */
  platformInduced: boolean;
  /** Root cause category */
  rootCause: "provider_fault" | "bad_assignment" | "hoarding" | "dropped_verification" | "unknown";
  /** Confidence in adjudication */
  confidence: number;
  /** Evidence used */
  evidenceRefs: string[];
  /** Timestamp */
  adjudicatedAt: Date;
}

/**
 * §20.5 — Concentration index measurement (Herfindahl-like).
 */
export interface ConcentrationIndex {
  /** Zone reference */
  zoneRef: string;
  /** Herfindahl-Hirschman Index (0=perfect competition, 1=monopoly) */
  hhi: number;
  /** Threshold above which exploration is added */
  threshold: number;
  /** Whether exploration/equity term was added */
  explorationAdded: boolean;
  /** Per-provider flow shares */
  providerShares: Record<string, number>;
}

/**
 * §30 — Claims classification for dispute resolution.
 */
export type ClaimsClassification =
  | "verified_fulfillment"
  | "provider_failure"
  | "platform_failure"
  | "ambiguous"
  | "fraudulent";

/**
 * §21.5 — User-equilibrium guard output.
 */
export interface UserEquilibriumGuard {
  /** Current SO (System Optimal) flow on critical links */
  soFlow: Record<string, number>;
  /** Current UE (User Equilibrium) flow on critical links */
  ueFlow: Record<string, number>;
  /** Maximum deviation across critical links */
  maxDeviation: number;
  /** Threshold δ for replanning */
  threshold: number;
  /** Whether guard triggered (replan needed) */
  triggered: boolean;
  /** Recommendation */
  recommendation: string;
}

/**
 * §33.2 — Calibration feedback metrics.
 */
export interface CalibrationFeedbackMetrics {
  /** Stratified calibration metrics per L4 */
  stratifiedMetrics: Record<string, { expected: number; observed: number }>;
  /** Recommit SLA hit rate */
  recommitSLAHitRate: number;
  /** G-level downgrade rate */
  gLevelDowngradeRate: number;
  /** Escrow utilization */
  escrowUtilization: number;
  /** Dispute resolution time (avg in ms) */
  avgDisputeResolutionMs: number;
  /** Commitment fulfillment rate */
  commitmentFulfillmentRate: number;
  /** Timestamp of metrics snapshot */
  snapshotAt: Date;
}
