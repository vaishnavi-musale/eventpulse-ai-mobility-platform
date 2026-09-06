// §12.4 — Per-resource-type buffer profiles (replaces universal 15%).
// Reserve acts as buffer release (L5) and commitment-reopen pool (L3).
// Each profile is configurable and F-graded against prior events.
import { ResourceType, BufferProfile } from "@core/domain/capacity-unit";

export interface BufferProfileDefinition {
  /** usable fraction of contract (0..1) — capacity actually sold/used. */
  usableFraction: number;
  /** reserve fraction of contract (0..1). usable + reserve ≈ 1. */
  reserveFraction: number;
  bufferProfile: BufferProfile;
}

export const DEFAULT_BUFFER_PROFILES: Readonly<
  Record<ResourceType, BufferProfileDefinition>
> = {
  metro_platform: {
    usableFraction: 0.88,
    reserveFraction: 0.12,
    bufferProfile: "metro",
  },
  shuttle_bus: {
    usableFraction: 0.92,
    reserveFraction: 0.08,
    bufferProfile: "shuttle",
  },
  hotel: {
    usableFraction: 0.85,
    reserveFraction: 0.15,
    bufferProfile: "hotel",
  },
  event_gate: {
    usableFraction: 0.9,
    reserveFraction: 0.1,
    bufferProfile: "gate",
  },
  restaurant: {
    usableFraction: 0.82,
    reserveFraction: 0.18,
    bufferProfile: "restaurant",
  },
  parking: {
    usableFraction: 0.85,
    reserveFraction: 0.15,
    bufferProfile: "parking",
  },
  hold_zone: {
    usableFraction: 0.82,
    reserveFraction: 0.18,
    bufferProfile: "hold_zone",
  },
};

export class BufferProfileRegistry {
  private readonly profiles = new Map<ResourceType, BufferProfileDefinition>(
    Object.entries(DEFAULT_BUFFER_PROFILES) as [
      ResourceType,
      BufferProfileDefinition,
    ][],
  );

  /** Override a profile for a specific resource type (configurable, F-graded). */
  set(resourceType: ResourceType, def: BufferProfileDefinition): void {
    this.profiles.set(resourceType, def);
  }

  get(resourceType: ResourceType): BufferProfileDefinition {
    return (
      this.profiles.get(resourceType) ??
      DEFAULT_BUFFER_PROFILES[resourceType] ?? {
        usableFraction: 0.85,
        reserveFraction: 0.15,
        bufferProfile: "hold_zone",
      }
    );
  }
}
