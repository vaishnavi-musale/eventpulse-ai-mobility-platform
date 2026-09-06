// §12.5 — Restaurant adapter. No reservation/cancellation API (spec). Capacity TBD.
import {
  ProviderAdapter,
  ProviderObservation,
  ProviderKind,
  ProviderAdapterFactory,
} from "../provider-adapter.interface";
import { createUncertainValue } from "@core/common/uncertain-value";

const KIND: ProviderKind = "restaurant";

export class RestaurantAdapter implements ProviderAdapter {
  readonly kind = KIND;
  readonly name = "Restaurant";
  readonly minCadenceMs = 120_000;

  constructor(
    private readonly venues: Array<{ zone: string; capacity: number }> = [],
  ) {}

  async pull(): Promise<ProviderObservation[]> {
    return this.venues.map((v) => ({
      capacityUnitRef: `${KIND}:${v.zone}`,
      resourceType: "restaurant" as const,
      geoZone: v.zone,
      availableCommitments: createUncertainValue(
        v.capacity * 0.82,
        0,
        v.capacity,
        0.9,
        "uncalibrated",
      ),
      currentOccupancy: 0,
      contractCapacity: v.capacity,
      verificationState: "MANUAL",
      verifiedInventory: false, // no reservation API => cannot HARD-back
      sourceSystem: KIND,
      observedAt: new Date(),
      modality: "pos-orders",
      upstreamDependency: undefined,
    }));
  }
}

export const restaurantAdapterFactory: ProviderAdapterFactory = {
  kind: KIND,
  create: (cfg) =>
    new RestaurantAdapter(
      (cfg?.venues as Array<{ zone: string; capacity: number }>) ?? [],
    ),
};
