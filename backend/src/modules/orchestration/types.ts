// §19/§21/§22 — Action Orchestration types
import { GLevel } from "../../core/domain/g-level.enum";
import { Channel } from "../../core/domain/commitment-token";
import { OperatingMode } from "../../core/domain/operating-mode.enum";

/**
 * §19.1 — Authority matrix entry: named controller per zone for conflict arbitration.
 */
export interface AuthorityEntry {
  /** Unique authority ID */
  id: string;
  /** Zone this authority applies to */
  zoneRef: string;
  /** Named controller (human or system) */
  controllerName: string;
  /** Authority type */
  authorityType: "zone_arbiter" | "emergency" | "platform";
  /** Allowed action scopes */
  allowedScopes: string[];
  /** Whether this authority can override safety constraints */
  canBypassSafety: boolean;
  /** Expiry timestamp */
  expiresAt: Date;
}

/**
 * §19.2 — Human override request.
 */
export interface OverrideRequest {
  /** Requester identity */
  requesterRole: string;
  /** Authentication evidence (MFA token in prod / API key in MVP) */
  authEvidence: string;
  /** Target zone */
  zoneRef: string;
  /** Action to override */
  action: string;
  /** Reason code (mandatory, audited) */
  reasonCode: string;
  /** Detailed explanation */
  reasonDetail: string;
  /** Expiry window for the override */
  expiryMs: number;
  /** Whether safety constraints are being bypassed */
  bypassSafety: boolean;
}

/**
 * §19.2 — Override decision.
 */
export interface OverrideDecision {
  granted: boolean;
  overrideId?: string;
  expiresAt?: Date;
  reason: string;
  /** If rejected, explanation */
  rejectionReason?: string;
}

/**
 * §22 — Channel delivery tracking (4 separate measurements).
 */
export interface ChannelDeliveryMetrics {
  channel: Channel;
  /** Reach: messages sent to the channel */
  reach: number;
  /** Delivery: messages confirmed delivered */
  delivery: number;
  /** Ack: messages acknowledged by recipient */
  ack: number;
  /** Compliance: messages meeting compliance requirements */
  compliance: number;
}

/**
 * §22 — Per-channel dispatch request.
 */
export interface ChannelDispatchRequest {
  channel: Channel;
  recipientRef: string;
  message: string;
  /** Whether this is a HARD token (G3/G5) delivery */
  isHardToken: boolean;
  /** Whether the channel can confirm delivery */
  confirmable: boolean;
  /** Priority level */
  priority: "normal" | "high" | "critical";
}

/**
 * §22 — Dispatch result.
 */
export interface ChannelDispatchResult {
  dispatched: boolean;
  channel: Channel;
  deliveryId: string;
  /** Whether acknowledgment is required */
  ackRequired: boolean;
  reason?: string;
}

/**
 * §21.4 — Replanning deviation measurement.
 */
export interface DeviationMeasurement {
  /** Current deviation from plan */
  currentDeviation: number;
  /** Threshold for replanning Nₐ(t) */
  replanThreshold: number;
  /** Time to danger (seconds) */
  timeToDanger: number;
  /** System dynamics score (0=steady, 1=volatile) */
  dynamicsScore: number;
  /** Whether replanning is triggered */
  replanTriggered: boolean;
}

/**
 * §21.4 — Replan hysteresis state.
 */
export interface ReplanState {
  /** Current hysteresis counter Nₐ */
  currentThreshold: number;
  /** Persistence bonus (prevents flapping) */
  persistenceBonus: number;
  /** Last replan timestamp */
  lastReplanAt: Date;
  /** Number of consecutive steady-state readings */
  steadyCount: number;
}
