// §12.5 — Metro adapter. Reserved/capacity/cancellation APIs are per-agency
// validation artifacts; never assumed verified.
import {
  ProviderAdapter,
  ProviderObservation,
  ProviderKind,
  ProviderAdapterFactory,
} from "../provider-adapter.interface";
import { createUncertainValue } from "@core/common/uncertain-value";

const KIND: ProviderKind = "metro";

export class MetroAdapter implements ProviderAdapter {
  readonly kind = KIND;
  readonly name = "Metro";
  readonly minCadenceMs = 60_000;

  constructor(
    private readonly zones: Array<{ zone: string; capacity: number }> = [],
    private readonly contractId?: string,
  ) {}

  async pull(): Promise<ProviderObservation[]> {
    // Concrete transport integration lives here. For the MVP the adapter
    // reports that unverified capabilities (TBD) are not usable.
    return this.zones.map((z) => ({
      capacityUnitRef: `${KIND}:${z.zone}`,
      resourceType: "metro_platform" as const,
      geoZone: z.zone,
      availableCommitments: createUncertainValue(
        z.capacity * 0.88,
        0,
        z.capacity,
        0.9,
        "uncalibrated",
      ),
      currentOccupancy: 0,
      contractCapacity: z.capacity,
      verificationState: "ESTIMATED",
      verifiedInventory: false,
      sourceSystem: KIND,
      observedAt: new Date(),
      modality: "faregates",
      upstreamDependency: `metro-agency:${this.contractId ?? "?"}`,
    }));
  }
}

export const metroAdapterFactory: ProviderAdapterFactory = {
  kind: KIND,
  create: (cfg) =>
    new MetroAdapter(
      (cfg?.zones as Array<{ zone: string; capacity: number }>) ?? [],
      (cfg?.contractId as string) ?? undefined,
    ),
};
