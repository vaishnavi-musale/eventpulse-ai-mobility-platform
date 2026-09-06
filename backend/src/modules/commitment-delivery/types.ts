// §25 — Commitment & Delivery Engine types
import { GLevel } from "../../core/domain/g-level.enum";
import {
  CommitmentType,
  CommitmentState,
  Channel,
  VerificationMechanism,
} from "../../core/domain/commitment-token";

/**
 * §25 — Token lifecycle transition.
 */
export interface TokenTransition {
  tokenId: string;
  from: CommitmentState;
  to: CommitmentState;
  gLevel: GLevel;
  reason: string;
  timestamp: Date;
}

/**
 * §8.4 — Escrow state for a zone/event.
 */
export interface EscrowState {
  id: string;
  zoneRef: string;
  /** Pre-funded escrow amount */
  fundedAmount: number;
  /** Current available balance */
  availableBalance: number;
  /** Per-token compensation estimate used for cap calculation */
  perTokenCompensation: number;
  /** Expected failure hazard rate */
  expectedFailureHazard: number;
  /** Safety margin multiplier */
  margin: number;
  /** Maximum issued commitment cap ≤ escrow */
  issuedCap: number;
  /** Current issued commitments count */
  issuedCount: number;
  /** Tokens held (active commitments) */
  heldCount: number;
  /** Timestamp of last top-up or draw-down */
  lastAdjustment: Date;
}

/**
 * §25 — Escrow computation input.
 */
export interface EscrowComputation {
  /** Total G5/G3 token count */
  hardTokenCount: number;
  /** Per-token compensation value */
  perTokenCompensation: number;
  /** Expected failure hazard rate */
  expectedFailureHazard: number;
  /** Safety margin */
  margin: number;
}

/**
 * §25 — Computed escrow requirement.
 */
export interface EscrowRequirement {
  /** Required escrow amount */
  required: number;
  /** Breakdown of the computation */
  breakdown: {
    hardTokens: number;
    perTokenCompensation: number;
    expectedFailureHazard: number;
    margin: number;
    baseAmount: number;
  };
}

/**
 * §25.3 — Evidence mechanism per category.
 */
export interface FulfillmentEvidence {
  tokenId: string;
  category: CommitmentType;
  mechanism: VerificationMechanism;
  /** Raw evidence data (QR scan payload, PMS record, etc.) */
  evidenceData: Record<string, unknown>;
  /** Timestamp when evidence was collected */
  collectedAt: Date;
  /** Whether cross-evidence check passed */
  crossCheckPassed: boolean;
  /** Source system identifier */
  sourceSystem: string;
}

/**
 * §25.3 — Fulfillment decision.
 */
export interface FulfillmentDecision {
  tokenId: string;
  fulfilled: boolean;
  /** Auto-decided (scan-backed) or human-required (ambiguous) */
  decisionPath: "auto" | "human";
  /** If human, reason code for escalation */
  escalationReason?: string;
  /** Evidence references */
  evidenceRefs: string[];
  /** Timestamp of decision */
  decidedAt: Date;
}

/**
 * §25.4 — Re-offering pipeline stage timing.
 */
export interface ReOfferingPipeline {
  tokenId: string;
  /** Stage timestamps for the 90s engineering target */
  noShowDetectedAt?: Date;
  releasedAt?: Date;
  selectedAt?: Date;
  matchedAt?: Date;
  notifiedAt?: Date;
  acceptedAt?: Date;
  providerConfirmedAt?: Date;
  /** Total elapsed (measured, not guaranteed) */
  totalElapsedMs?: number;
  /** Whether the pipeline completed within target */
  withinTarget: boolean;
}

/**
 * §25.6 — Recommit SLA tracking.
 */
export interface RecommitSLA {
  tokenId: string;
  /** When the provider collapse was verified */
  collapsedAt: Date;
  /** Deadline for recommit (5min target) */
  deadlineMs: number;
  /** Whether recommit was completed */
  completed: boolean;
  /** If completed, the new token ID */
  newTokenId?: string;
  /** If missed, auto-compensation was triggered */
  compensationTriggered: boolean;
  /** Compensation amount drawn from escrow */
  compensationAmount?: number;
}

/**
 * §25.3 — Dispute path.
 */
export interface DisputeRecord {
  tokenId: string;
  openedAt: Date;
  reason: string;
  evidence: FulfillmentEvidence[];
  resolvedAt?: Date;
  resolution?: "fulfilled" | "forfeited" | "refunded";
}
