// §17/§30 — Simulation output types with evidence tier tagging
import type { UncertainValue } from "@core/common/uncertain-value";
import type { GLevel } from "@core/domain/g-level.enum";
import type {
  SurrogateBiasCorrection,
  SurrogateBiasContext,
} from "./simulation-config.types";

// §30 — Evidence tier for simulation outputs
export type EvidenceTier = "S" | "A" | "B" | "C";

export interface EvidenceTag {
  tier: EvidenceTier;
  /** Whether this metric is visualization-only (n <= vizOnlyThreshold) */
  isVisualizationOnly: boolean;
  /** Stated confidence interval */
  ci: UncertainValue;
  /** Number of MC iterations used */
  iterationCount: number;
  /** Whether importance sampling was applied */
  importanceSamplingUsed: boolean;
  /** Human-readable evidence annotation */
  annotation: string;
}

// Per-zone, per-window simulation snapshot
export interface ZoneTimeSnapshot {
  zoneId: string;
  timeWindowIndex: number;
  /** Simulated attendee count in zone */
  load: number;
  /** Density (attendees per m²) */
  density: number;
  /** Density limit for zone */
  densityLimit: number;
  /** Whether density limit was violated */
  densityViolation: boolean;
  /** Egress flow (attendees/min) */
  egressFlow: number;
  /** P95 egress time in minutes */
  egressP95: number;
  /** Egress target P95 in minutes */
  egressTargetP95: number;
  /** Whether egress target was violated */
  egressViolation: boolean;
  /** Hold zone usage */
  holdUsage: number;
  /** Hold comfort rating */
  holdComfort: number;
  /** Hold time exceeded */
  holdTimeViolation: boolean;
  /** Vulnerable group egress */
  vulnerableGroupEgress: number;
  /** Floor for vulnerable group */
  vulnerableGroupFloor: number;
  /** Vulnerable group violation */
  vulnerableGroupViolation: boolean;
  /** Emergency vehicle access preserved */
  emergencyAccessPreserved: boolean;
  /** Commitment token compliance in this window */
  complianceRate: number;
}

export interface SimulationTrace {
  /** Ordered snapshots per zone per time window */
  snapshots: ZoneTimeSnapshot[];
  /** Overall simulation statistics */
  stats: SimulationStats;
}

export interface SimulationStats {
  /** Mean load across all zones/windows */
  meanLoad: number;
  /** Max density observed */
  maxDensity: number;
  /** Number of safety violations observed */
  totalViolations: number;
  /** Violation breakdown by type */
  violationsByType: Record<string, number>;
  /** Mean compliance rate */
  meanComplianceRate: number;
  /** P99 egress time across all zones */
  egressP99: number;
}

// §17 — Full Monte Carlo output
export interface MonteCarloOutput {
  /** Number of iterations actually run */
  iterationsRun: number;
  /** Whether results are visualization-only */
  isVisualizationOnly: boolean;
  /** Evidence tag */
  evidence: EvidenceTag;
  /** Aggregated stats across all iterations (mean, CI) */
  aggregatedStats: {
    meanLoad: UncertainValue;
    maxDensity: UncertainValue;
    violationRate: UncertainValue;
    meanComplianceRate: UncertainValue;
    egressP95: UncertainValue;
  };
  /** Individual iteration traces (retained for debugging, may be large) */
  iterationTraces: SimulationTrace[];
  /** Importance sampling weights (if used) */
  importanceWeights?: number[];
}

// §17.4 — Shadow City counterfactual delta
export interface ShadowCityDelta {
  /** Whether this is a simulated counterfactual impact (tier S) — never "causal" */
  evidenceLabel: "simulated_counterfactual_impact";
  evidence: EvidenceTag;
  /** Delta in mean load: with_plan - without_plan per zone */
  loadDeltaByZone: Record<
    string,
    {
      value: number;
      ci: UncertainValue;
    }
  >;
  /** Delta in violation rate */
  violationRateDelta: UncertainValue;
  /** Delta in mean compliance */
  complianceDelta: UncertainValue;
  /** Delta in egress P95 */
  egressDelta: UncertainValue;
  /** Same RNG seed used for both runs */
  sharedSeed: number;
  /** Annotation explicitly disclaiming causality */
  annotation: string;
}

// §17.2 — Red-team stress output
export interface RedTeamResult {
  /** Label for the stress test */
  scenarioLabel: string;
  /** Compliance distribution used */
  complianceDistribution: { p5: number; p95: number };
  /** HARD-slip rate */
  hardSlipRate: number;
  /** Resulting violation rate under stress */
  violationRate: UncertainValue;
  /** Evidence tag */
  evidence: EvidenceTag;
  /** Advisories generated */
  advisories: string[];
}

// §17.5 — Surrogate loop output
export interface SurrogateLoopResult {
  /** Per-iteration-count results */
  perIteration: Array<{
    iterationCount: number;
    result: MonteCarloOutput;
    biasCorrection: SurrogateBiasCorrection;
  }>;
  /** Validity gate status per iteration */
  validityGateStatus: Record<number, boolean>;
  /** Final bias-corrected result (from highest valid iteration) */
  finalResult: MonteCarloOutput;
}

// §17 — Complete simulation output
export interface SimulationResult {
  id: string;
  planId: string;
  scenarioId: string;
  /** Primary Monte Carlo result */
  monteCarlo: MonteCarloOutput;
  /** Shadow City counterfactual (if enabled) */
  shadowCity?: ShadowCityDelta;
  /** Red-team stress results (if enabled) */
  redTeamResults: RedTeamResult[];
  /** Surrogate-modulated loop result */
  surrogateLoop?: SurrogateLoopResult;
  /** Overall evidence tier */
  overallEvidenceTier: EvidenceTier;
  /** Timestamp of completion */
  completedAt: Date;
  /** Duration in ms */
  durationMs: number;
}
