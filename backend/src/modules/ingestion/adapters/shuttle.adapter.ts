// §12.5 — Shuttle adapter. All capabilities TBD per the matrix in this deployment.
import {
  ProviderAdapter,
  ProviderObservation,
  ProviderKind,
  ProviderAdapterFactory,
} from "../provider-adapter.interface";
import { createUncertainValue } from "@core/common/uncertain-value";

const KIND: ProviderKind = "shuttle";

export class ShuttleAdapter implements ProviderAdapter {
  readonly kind = KIND;
  readonly name = "Shuttle";
  readonly minCadenceMs = 30_000;

  constructor(
    private readonly buses: Array<{ zone: string; capacity: number }> = [],
  ) {}

  async pull(): Promise<ProviderObservation[]> {
    return this.buses.map((b) => ({
      capacityUnitRef: `${KIND}:${b.zone}`,
      resourceType: "shuttle_bus" as const,
      geoZone: b.zone,
      availableCommitments: createUncertainValue(
        b.capacity * 0.92,
        0,
        b.capacity,
        0.9,
        "uncalibrated",
      ),
      currentOccupancy: 0,
      contractCapacity: b.capacity,
      verificationState: "ESTIMATED",
      verifiedInventory: false, // reservation API unverified => cannot back G5/G3
      sourceSystem: KIND,
      observedAt: new Date(),
      modality: "vehicle-gps",
      upstreamDependency: "shuttle-dispatch",
    }));
  }
}

export const shuttleAdapterFactory: ProviderAdapterFactory = {
  kind: KIND,
  create: (cfg) =>
    new ShuttleAdapter(
      (cfg?.buses as Array<{ zone: string; capacity: number }>) ?? [],
    ),
};
