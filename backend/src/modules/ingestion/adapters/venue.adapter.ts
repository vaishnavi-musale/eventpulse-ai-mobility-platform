// §12.5 — Venue adapter. Reservation API partial; capacity/cancellation TBD.
import {
  ProviderAdapter,
  ProviderObservation,
  ProviderKind,
  ProviderAdapterFactory,
} from "../provider-adapter.interface";
import { createUncertainValue } from "@core/common/uncertain-value";

const KIND: ProviderKind = "venue";

export class VenueAdapter implements ProviderAdapter {
  readonly kind = KIND;
  readonly name = "Venue";
  readonly minCadenceMs = 30_000;

  constructor(
    private readonly gates: Array<{ zone: string; capacity: number }> = [],
  ) {}

  async pull(): Promise<ProviderObservation[]> {
    return this.gates.map((g) => ({
      capacityUnitRef: `${KIND}:${g.zone}`,
      resourceType: "event_gate" as const,
      geoZone: g.zone,
      availableCommitments: createUncertainValue(
        g.capacity * 0.9,
        0,
        g.capacity,
        0.9,
        "uncalibrated",
      ),
      currentOccupancy: 0,
      contractCapacity: g.capacity,
      verificationState: "CONFIRMED_REALTIME", // gate counters confirm in realtime
      verifiedInventory: true, // gate counters are accepted evidence here
      sourceSystem: KIND,
      observedAt: new Date(),
      modality: "turnstile",
      upstreamDependency: "venue-gate-controller",
    }));
  }
}

export const venueAdapterFactory: ProviderAdapterFactory = {
  kind: KIND,
  create: (cfg) =>
    new VenueAdapter(
      (cfg?.gates as Array<{ zone: string; capacity: number }>) ?? [],
    ),
};
