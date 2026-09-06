// §12.5 — Provider API adapter abstraction + pluggable adapters.
// Exposes capability flags (§12.5 matrix) so the pipeline never assumes an
// unverified integration. All observations are delivered with an UncertainValue
// (value + CI + calibration rating).
import { UncertainValue } from "@core/common/uncertain-value";
import { ResourceType } from "@core/domain/capacity-unit";

export type ProviderKind =
  "metro" | "shuttle" | "hotel-pms" | "restaurant" | "venue";

/** §12.5 — capabilities that must be validated before a plan may depend on them. */
export interface ProviderCapabilities {
  reservationApi: boolean;
  capacityApi: boolean;
  cancellationApi: boolean;
  reliability: boolean;
}

/** §12.1 — inventory verification state grades. */
export type ProviderVerificationState =
  "CONTRACTED" | "CONFIRMED_REALTIME" | "ESTIMATED" | "MANUAL";

export interface ProviderObservation {
  capacityUnitRef: string;
  resourceType: ResourceType;
  geoZone: string;
  /** Probabilistic expected availability in [0..contract] — NOT additive capacity. */
  availableCommitments: UncertainValue;
  currentOccupancy: number;
  contractCapacity: number;
  verificationState: ProviderVerificationState;
  verifiedInventory: boolean;
  sourceSystem: string;
  observedAt: Date;
  /** modality + upstream for §16.2 operational-independence checks. */
  modality: string;
  upstreamDependency?: string;
}

/**
 * §12.5 — contract every provider adapter implements. Adapters are registered
 * with their kind so capability flags can be carried through the pipeline.
 */
export interface ProviderAdapter {
  readonly kind: ProviderKind;
  readonly name: string;
  /** nominal real-time cadence capability (ms) for §16.3 adaptive frequency. */
  readonly minCadenceMs: number;
  pull(): Promise<ProviderObservation[]>;
}

export interface ProviderAdapterFactory {
  readonly kind: ProviderKind;
  create(cfg?: Record<string, unknown>): ProviderAdapter;
}
