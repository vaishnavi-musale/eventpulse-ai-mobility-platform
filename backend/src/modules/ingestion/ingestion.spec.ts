// §12 — L1 Ingestion unit tests.
import { Test } from "@nestjs/testing";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { IngestionService } from "./ingestion.service";
import { TrustScoringService } from "./trust.service";
import { VerifiedInventoryService } from "./verified-inventory.service";
import { UnsafeZoneService } from "./unsafe-zone.service";
import { SpikeDetectionService } from "./spike-detection.service";
import { metroAdapterFactory, venueAdapterFactory } from "./adapters";

function fakeBus(published: unknown[]): EventBus {
  return {
    publish: async (e) => {
      published.push(e);
    },
    subscribe: () => () => {},
    shutdown: async () => {},
  } as EventBus;
}

describe("Ingestion (L1) — §12/§9/§12.5", () => {
  async function build() {
    const published: unknown[] = [];
    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestionService,
        TrustScoringService,
        VerifiedInventoryService,
        UnsafeZoneService,
        SpikeDetectionService,
        { provide: EVENT_BUS, useValue: fakeBus(published) },
      ],
    }).compile();
    return { svc: moduleRef.get(IngestionService), published };
  }

  it("applies per-resource-type buffer profiles (§12.4)", async () => {
    const { svc } = await build();
    const r = await svc.ingestUnit(
      {
        capacityUnitRef: "metro:A",
        resourceType: "metro_platform",
        geoZone: "A",
        contractCapacity: 1000,
        safetyBufferUnits: 0,
        headroom: { p50: 40, p10: 20, p90: 60, evidenceRef: "e1" },
        headroomConsented: true,
        trust: {
          reliability: 0.9,
          freshness: 0.9,
          accuracy: 0.05,
          crossSourceAgreement: 0.9,
          sensorHealth: 0.9,
        },
        sourceSystem: "metro",
        verificationState: "CONTRACTED",
      },
      new Date(),
    );
    // metro usable 88% + released headroom 40
    expect(r.usableCapacity).toBeCloseTo(1000 * 0.88 + 40, 0);
    expect(r.bufferProfile).toBe("metro");
  });

  it("releases headroom only with consent (§12.2)", async () => {
    const { svc } = await build();
    const r = await svc.ingestUnit(
      {
        capacityUnitRef: "hotel:H1",
        resourceType: "hotel",
        geoZone: "H1",
        contractCapacity: 100,
        safetyBufferUnits: 0,
        headroom: { p50: 10, p10: 5, p90: 15, evidenceRef: "e" },
        headroomConsented: false,
        trust: {
          reliability: 0.9,
          freshness: 0.9,
          accuracy: 0.05,
          crossSourceAgreement: 0.9,
          sensorHealth: 0.9,
        },
        sourceSystem: "pms",
        verificationState: "CONTRACTED",
      },
      new Date(),
    );
    expect(r.releasedHeadroom).toBe(0); // no consent → no release
  });

  it("below-threshold trust forces G2 (§12.3)", async () => {
    const { svc } = await build();
    const r = await svc.ingestUnit(
      {
        capacityUnitRef: "m:M",
        resourceType: "metro_platform",
        geoZone: "M",
        contractCapacity: 100,
        safetyBufferUnits: 0,
        headroom: { p50: 0, p10: 0, p90: 0, evidenceRef: "e" },
        headroomConsented: false,
        trust: {
          reliability: 0.1,
          freshness: 0.1,
          accuracy: 0.9,
          crossSourceAgreement: 0.1,
          sensorHealth: 0.1,
        },
        sourceSystem: "metro",
        verificationState: "ESTIMATED",
      },
      new Date(),
    );
    expect(r.maxGLevel).toBe("G2");
  });

  it("HARD (G3/G5) requires verified inventory (§12.1/§6.3)", async () => {
    const { svc } = await build();
    const r = await svc.ingestUnit(
      {
        capacityUnitRef: "r:R",
        resourceType: "restaurant",
        geoZone: "R",
        contractCapacity: 50,
        safetyBufferUnits: 0,
        headroom: { p50: 0, p10: 0, p90: 0, evidenceRef: "" },
        headroomConsented: false,
        trust: {
          reliability: 0.9,
          freshness: 0.9,
          accuracy: 0.05,
          crossSourceAgreement: 0.9,
          sensorHealth: 0.9,
        },
        sourceSystem: "restaurant",
        verificationState: "MANUAL",
      },
      new Date(),
    );
    // restaurant has no reservation API → not verified → G2
    expect(r.maxGLevel).toBe("G2");
  });

  it("adapter capability matrix marks unverified capabilities TBD (§12.5)", async () => {
    const metro = metroAdapterFactory.create({
      zones: [{ zone: "A", capacity: 100 }],
    });
    const venue = venueAdapterFactory.create({
      gates: [{ zone: "B", capacity: 200 }],
    });
    const metroObs = await metro.pull();
    const venueObs = await venue.pull();
    expect(metroObs[0].verifiedInventory).toBe(false); // capacityApi TBD
    expect(venueObs[0].verifiedInventory).toBe(true); // realtime gate counters
  });
});
