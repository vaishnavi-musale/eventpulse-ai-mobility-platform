// §18/§30 — Optimization result types
import type { UncertainValue } from "@core/common/uncertain-value";
import type { OptimizationPlan } from "./plan.types";
import type { ConstraintSet } from "./constraint.types";

export type OptimizationEvidenceTier = "S" | "A" | "B" | "C";

export interface OptimizationEvidenceTag {
  tier: OptimizationEvidenceTier;
  /** Whether this result was produced by the full solver or greedy fallback */
  producedBy: "solver" | "greedy_fallback";
  /** Solver time used in ms */
  solverTimeMs: number;
  /** Whether solver timed out (forced greedy fallback) */
  solverTimedOut: boolean;
  /** Stated CI for probabilistic metrics */
  ciLevel: number;
}

// §18.1 — Feasibility report
export interface FeasibilityReport {
  feasible: boolean;
  /** Plans that pass physical_inventory_exists check */
  feasiblePlanCount: number;
  /** Plans rejected due to inventory violation */
  infeasiblePlanCount: number;
  /** Detailed per-plan checks */
  planChecks: Array<{
    planId: string;
    feasible: boolean;
    violations: string[];
  }>;
}

// §18 — Complete optimization output
export interface OptimizationResult {
  id: string;
  /** Pareto-optimal plans (3-5 plans) */
  plans: OptimizationPlan[];
  /** Constraint set applied */
  constraintSet: ConstraintSet;
  /** Feasibility report */
  feasibility: FeasibilityReport;
  /** Evidence tag */
  evidence: OptimizationEvidenceTag;
  /** Whether greedy fallback was used */
  usedGreedyFallback: boolean;
  /** Chance constraint satisfaction */
  chanceConstraintSatisfied: boolean;
  /** Overall fairness status */
  fairnessStatus: {
    allGroupsSatisfied: boolean;
    tensionsLogged: number;
  };
  /** Anti-hoarding status */
  antiHoardingStatus: {
    allConstraintsSatisfied: boolean;
    violationsFound: number;
  };
  /** Timestamp */
  completedAt: Date;
  /** Duration in ms */
  durationMs: number;
}

// §18.7 — Pareto front output
export interface ParetoFront {
  /** Plans on the Pareto front (3-5 plans) */
  plans: OptimizationPlan[];
  /** Objectives considered */
  objectives: string[];
  /** Dominated plans excluded */
  dominatedCount: number;
}
