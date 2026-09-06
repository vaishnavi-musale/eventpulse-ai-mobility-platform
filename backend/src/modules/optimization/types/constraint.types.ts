// §18.2/§18.3/§18.5 — Formal safety constraint types
import type { GLevel } from "@core/domain/g-level.enum";
import type { ResourceType } from "@core/domain/capacity-unit";
import type { UncertainValue } from "@core/common/uncertain-value";

// §18.2 — All safety constraints are HARD, no priority override
export type ConstraintType =
  | "density_limit"
  | "egress_p95"
  | "hold_comfort_time"
  | "vulnerable_group_egress"
  | "no_unsafe_zone"
  | "emergency_veh_access"
  | "chance_constraint"
  | "min_service_level"
  | "physical_inventory_exists";

export type ConstraintSeverity = "HARD" | "SOFT";

export interface SafetyConstraint {
  id: string;
  type: ConstraintType;
  severity: ConstraintSeverity;
  /** Zone this constraint applies to */
  zoneId: string;
  /** Description */
  description: string;
  /** Constraint formula (human-readable for governance) */
  formula: string;
  /** Whether this constraint is satisfied in the current solution */
  satisfied: boolean;
  /** Residual: slack remaining (positive = margin, negative = violation) */
  residual: number;
}

// §18.3 — Chance constraint: P(∃ r∈C, ∃ t∈H: load_r(t) > usable_r(t)) < 10%
export interface ChanceConstraint {
  /** Target violation probability upper bound */
  targetViolationProbability: number;
  /** Critical resource set */
  criticalResources: ResourceType[];
  /** Planning horizon windows */
  horizonWindowCount: number;
  /** Sampling mode */
  samplingMode: "joint" | "independent";
  /** Joint sampling factors: demand · compliance · capacity */
  jointFactors: {
    demand: boolean;
    compliance: boolean;
    capacity: boolean;
  };
  /** Simulated probability with CI */
  simulatedProbability: UncertainValue;
  /** Whether constraint is satisfied */
  satisfied: boolean;
}

// §18.5 — Fairness constraint (self-declared protected groups only)
export interface FairnessConstraint {
  /** Protected group identifier (self-declared only, no proxy inference) */
  groupId: string;
  /** Minimum service level for this group */
  minServiceLevel: number;
  /** Actual service level achieved */
  actualServiceLevel: number;
  /** Whether satisfied */
  satisfied: boolean;
  /** Whether safety overrides fairness (safety always wins) */
  safetyOverridden: boolean;
  /** Governance log entry */
  governanceNote: string;
}

// §18.5 — Fairness vs safety tension resolution log
export interface FairnessSafetyTension {
  constraintId: string;
  groupId: string;
  fairnessLevel: number;
  safetyLevel: number;
  resolution: "safety_wins" | "no_tension";
  loggedAt: Date;
}

// §18.6 — Anti-hoarding constraint
export interface AntiHoardingConstraint {
  /** Attendee reference (pseudonymous) */
  attendeeRef: string;
  /** Commitment type */
  commitmentCategory: string;
  /** Number of active G>=2 tokens for this category */
  activeHighGTokenCount: number;
  /** Maximum allowed */
  maxAllowed: number;
  /** Release deadline */
  releaseDeadline: Date;
  /** Voucher tied to verified check-in */
  checkInVerified: boolean;
  /** Whether constraint is satisfied */
  satisfied: boolean;
}

// §18 — Complete constraint set
export interface ConstraintSet {
  /** All safety constraints (all HARD) */
  safetyConstraints: SafetyConstraint[];
  /** Chance constraint */
  chanceConstraint: ChanceConstraint;
  /** Fairness constraints */
  fairnessConstraints: FairnessConstraint[];
  /** Fairness-safety tension log */
  fairnessSafetyTensions: FairnessSafetyTension[];
  /** Anti-hoarding constraints */
  antiHoardingConstraints: AntiHoardingConstraint[];
  /** Physical inventory checks */
  physicalInventoryChecks: PhysicalInventoryCheckResult[];
  /** Summary */
  totalConstraints: number;
  satisfiedCount: number;
  violatedCount: number;
}

export interface PhysicalInventoryCheckResult {
  capacityUnitRef: string;
  physicalInventoryExists: boolean;
  exceedsVerified: boolean;
  exceedsContracted: boolean;
  allocatedCount: number;
  verifiedInventory: number;
  contractCapacity: number;
}
