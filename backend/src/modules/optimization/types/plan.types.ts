// §18/§44 — Optimization plan types
import type { CapacityUnit, ResourceType } from "@core/domain/capacity-unit";
import type { CommitmentToken } from "@core/domain/commitment-token";
import type { GLevel } from "@core/domain/g-level.enum";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";

// §18.1 — Plan allocation per resource per time window
export interface PlanAllocation {
  /** Unique allocation identifier */
  id: string;
  /** Zone reference */
  zoneId: string;
  /** Capacity unit reference */
  capacityUnitRef: string;
  /** Resource type */
  resourceType: ResourceType;
  /** Assigned G-level */
  gLevel: GLevel;
  /** Number of attendees allocated */
  attendeeCount: number;
  /** Time window */
  windowStart: Date;
  windowEnd: Date;
  /** Is this a gift allocation (G-level soft) */
  isGift: boolean;
}

// §18 — Complete plan
export interface OptimizationPlan {
  id: string;
  label: string;
  allocations: PlanAllocation[];
  totalAttendees: number;
  planningHorizonMinutes: number;
  /** Committed tokens referenced */
  committedTokens: CommitmentToken[];
  /** Which constraints are active */
  activeConstraints: string[];
  /** Which constraints are satisfied */
  satisfiedConstraints: string[];
  /** Constraint residuals */
  constraintResiduals: Record<string, number>;
  /** Objective value from solver */
  objectiveValue: number;
  /** Feasibility status */
  feasible: boolean;
  /** Pareto rank (1 = non-dominated) */
  paretoRank?: number;
}

// §18.1 — Physical inventory verification
export interface PhysicalInventoryCheck {
  /** Whether physical inventory exists for this unit */
  physicalInventoryExists: boolean;
  /** Verification state */
  verificationState: string;
  /** Contract capacity */
  contractCapacity: number;
  /** Verified inventory */
  verifiedInventory: number;
  /** Whether plan allocation exceeds verified */
  exceedsVerified: boolean;
  /** Whether exceeding contracted inventory */
  exceedsContracted: boolean;
}

// §18 — Plan input for optimizer
export interface OptimizationInput {
  /** Candidate plan allocations */
  allocations: PlanAllocation[];
  /** Zones with capacity data */
  zones: SimulationZone[];
  /** All capacity units */
  capacityUnits: CapacityUnit[];
  /** Total attendees to serve */
  totalAttendees: number;
  /** Planning horizon in minutes */
  planningHorizonMinutes: number;
  /** Solver timeout in seconds */
  solverTimeoutSeconds: number;
  /** Number of Pareto-optimal plans to return */
  paretoPlanCount: number;
}
