// §6/§44 — Guarantee Ladder types
import { GLevel } from "../../core/domain/g-level.enum";
import { OperatingMode } from "../../core/domain/operating-mode.enum";

/**
 * §6.2 — The live links whose status determines a token's current G-level.
 * Weakest link wins: G-level = min(grade_of_each_link).
 */
export interface GLinkStatus {
  inventoryVerified: boolean;
  escrowFunded: boolean;
  verificationChannelUp: boolean;
  operatingMode: OperatingMode;
}

/**
 * §6 — A deterministic mapping of link statuses to a single G-level.
 * Called at issuance AND every state transition (§6.2).
 */
export interface GComputeInput {
  requestedLevel: GLevel;
  links: GLinkStatus;
}

/**
 * §6 — Result of G-level computation with the degrade chain.
 */
export interface GComputeResult {
  /** The computed (possibly degraded) G-level */
  computedLevel: GLevel;
  /** The full degrade chain applied (empty if no degradation) */
  degradeChain: GLevel[];
  /** Reason for the final level */
  reason: string;
}

/**
 * §6.3 — South G-Ladder forbid rules.
 */
export interface GLadderForbidCheck {
  gLevel: GLevel;
  inventoryVerified: boolean;
  channelConfirmable: boolean;
  avgGLevel: number;
  labeledAsManaged: boolean;
}

export interface GLadderForbidResult {
  allowed: boolean;
  violation?: string;
}

/**
 * §26.1 — Mode-transition coupling rules.
 */
export interface ModeCouplingInput {
  fromMode: OperatingMode;
  toMode: OperatingMode;
  currentTokens: Array<{ gLevel: GLevel; state: string }>;
}
