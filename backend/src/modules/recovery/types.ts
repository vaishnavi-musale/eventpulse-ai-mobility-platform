// §27 — Recovery & Resilience types
import { Channel } from "../../core/domain/commitment-token";
import { GLevel } from "../../core/domain/g-level.enum";

/**
 * §27.1 — Signed offline token with validity window and cache.
 */
export interface OfflineTokenEntry {
  tokenId: string;
  /** Base64url signature */
  signature: string;
  /** JSON-encoded signed payload */
  payloadJson: string;
  /** Validity window */
  validFrom: Date;
  validUntil: Date;
  /** Whether the token is currently held */
  held: boolean;
  /** Provider reference */
  providerRef: string;
  /** G-level */
  gLevel: GLevel;
  /** Cache TTL seconds */
  cacheTtlSeconds: number;
}

/**
 * §27.1 — Provider-side signature cache entry.
 */
export interface SignatureCacheEntry {
  /** HMAC signature */
  signature: string;
  /** Cached at timestamp */
  cachedAt: Date;
  /** TTL in seconds */
  ttlSeconds: number;
  /** Token state at cache time */
  tokenState: string;
}

/**
 * §27.3 — Last-known-plan broadcast with delivery-vs-ack tracking.
 */
export interface LastKnownPlanMessage {
  id: string;
  planId: string;
  channel: Channel;
  body: string;
  sentAt: Date;
  /** Priority level */
  priority: "normal" | "high" | "critical";
}

/**
 * §27.3 — Delivery record with separate delivery vs ack tracking.
 */
export interface DeliveryRecord {
  messageId: string;
  recipientRef: string;
  deliveredAt?: Date;
  acknowledgedAt?: Date;
  ackRequired: boolean;
  /** Whether escalation is needed (ackRequired && !acknowledged && deadline passed) */
  escalationNeeded: boolean;
}

/**
 * §27 — Recovery state for a zone.
 */
export interface RecoveryState {
  zoneRef: string;
  /** Whether the zone is in recovery mode */
  inRecovery: boolean;
  /** Tokens that need re-offering after recovery */
  pendingReOffer: string[];
  /** Signed offline tokens valid during recovery */
  offlineTokens: OfflineTokenEntry[];
  /** Recovery start timestamp */
  recoveryStartedAt?: Date;
  /** Recovery complete timestamp */
  recoveryCompletedAt?: Date;
}
