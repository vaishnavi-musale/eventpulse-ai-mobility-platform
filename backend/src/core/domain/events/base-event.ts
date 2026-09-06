// §31 — EventPulse domain event base class
import { GLevel } from "../g-level.enum";

export type EventName =
  | "CapacityUnitStatusChanged"
  | "InventoryVerified"
  | "InventoryRevoked"
  | "TokenOffered"
  | "TokenAccepted"
  | "TokenHeld"
  | "TokenActivated"
  | "TokenFulfilled"
  | "TokenDowngraded"
  | "TokenForfeited"
  | "TokenRefunded"
  | "TokenVoidedByEmergency"
  | "FulfillmentVerified"
  | "DisputeOpened"
  | "DisputeResolved"
  | "EscrowTopUp"
  | "EscrowDrawDown"
  | "OverrideGranted"
  | "OverrideExpired"
  | "SafetyConstraintBlocked"
  | "ProviderFailureAdjudicated"
  | "OperatingModeChanged"
  | "PlanCommitted"
  // L1–L4 pipeline events
  | "SourceIngested"
  | "SourceTrustChanged"
  | "UnsafeZoneChanged"
  | "SpikeDetected"
  | "DataConflict"
  | "AnomalyDetected"
  | "ForecastEmitted"
  | "ForecastInvalidated"
  | "BaselineUpdated";

/**
 * §31 — Base class for all EventPulse domain events.
 * Serialized to JSON for the EventBus/EventStore.
 */
export class EventPulseDomainEvent<T = unknown> {
  readonly id: string;
  readonly eventName: EventName;
  readonly aggregateId: string;
  readonly gLevel?: GLevel;
  readonly timestamp: Date;
  readonly version: number;
  readonly payload: T;

  constructor(init: {
    id: string;
    eventName: EventName;
    aggregateId: string;
    gLevel?: GLevel;
    timestamp?: Date;
    version: number;
    payload: T;
  }) {
    this.id = init.id;
    this.eventName = init.eventName;
    this.aggregateId = init.aggregateId;
    this.gLevel = init.gLevel;
    this.timestamp = init.timestamp ?? new Date();
    this.version = init.version;
    this.payload = init.payload;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      eventName: this.eventName,
      aggregateId: this.aggregateId,
      gLevel: this.gLevel,
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      payload: this.payload,
    };
  }
}
