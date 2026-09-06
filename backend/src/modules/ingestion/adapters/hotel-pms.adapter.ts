// §12.5 — Hotel PMS adapter. Reservation API partial; capacity/cancellation TBD.
import {
  ProviderAdapter,
  ProviderObservation,
  ProviderKind,
  ProviderAdapterFactory,
} from "../provider-adapter.interface";
import { createUncertainValue } from "@core/common/uncertain-value";

const KIND: ProviderKind = "hotel-pms";

export class HotelPmsAdapter implements ProviderAdapter {
  readonly kind = KIND;
  readonly name = "Hotel PMS";
  readonly minCadenceMs = 60_000;

  constructor(
    private readonly hotels: Array<{ zone: string; capacity: number }> = [],
  ) {}

  async pull(): Promise<ProviderObservation[]> {
    return this.hotels.map((h) => ({
      capacityUnitRef: `${KIND}:${h.zone}`,
      resourceType: "hotel" as const,
      geoZone: h.zone,
      availableCommitments: createUncertainValue(
        h.capacity * 0.85,
        0,
        h.capacity,
        0.9,
        "uncalibrated",
      ),
      currentOccupancy: 0,
      contractCapacity: h.capacity,
      verificationState: "MANUAL", // partial reservation confirming only
      verifiedInventory: false,
      sourceSystem: KIND,
      observedAt: new Date(),
      modality: "pms-room-status",
      upstreamDependency: "pms-gateway",
    }));
  }
}

export const hotelPmsAdapterFactory: ProviderAdapterFactory = {
  kind: KIND,
  create: (cfg) =>
    new HotelPmsAdapter(
      (cfg?.hotels as Array<{ zone: string; capacity: number }>) ?? [],
    ),
};
