import { GLevel } from "./g-level.enum";
import { OperatingMode } from "./operating-mode.enum";

export type ResourceType =
  | "metro_platform"
  | "shuttle_bus"
  | "hotel"
  | "event_gate"
  | "restaurant"
  | "parking"
  | "hold_zone";

export type CapacityStatus =
  "free" | "stressed" | "saturated" | "critical" | "unavailable";

export type BufferProfile =
  | "metro" | "shuttle" | "hotel" | "gate" | "restaurant" | "parking" | "hold_zone";

export type InventoryVerificationState =
  "CONTRACTED" | "CONFIRMED_REALTIME" | "ESTIMATED" | "MANUAL";

/** §4.2 core abstraction */
export interface CapacityUnit {
  id: string;
  type: ResourceType;
  geoZone: string;
  contractCapacity: number;
  overbookHeadroomP50: number; // probabilistic expected availability, NOT additive
  savedSafetyBuffer: number;
  usableCapacity: number; // contract - safety buffer
  reserveCapacity: number; // per-resource-type buffer profile
  currentOccupancy: number;
  status: CapacityStatus;
  bufferProfile: BufferProfile;
  holdComfort: number; // infra rating for holding crowds
  lastUpdated: Date;
  sourceSystem: string;
  confidence: number; // C_data trust score
  committedSlots: number;
  availableCommitments: number;
  verifiedInventory: boolean; // §18.1 hard constraint backing G5/G3
  verificationState: InventoryVerificationState;
}

export interface CapacityUnitSnapshot extends CapacityUnit {
  operatingMode: OperatingMode;
  gLevelCeiling: GLevel;
}
