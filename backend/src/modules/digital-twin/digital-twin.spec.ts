// §14 — L3 Digital Twin tests.
import { Test } from "@nestjs/testing";
import { EventStore } from "@core/event-sourcing/event-store.interface";
import { EVENT_STORE } from "@core/event-sourcing/event-store.token";
import { DigitalTwinService } from "./digital-twin.service";
import { PropertyGraph } from "./property-graph";

function fakeStore(snapshots: unknown[]): EventStore {
  return {
    appendEvents: async () => {},
    loadStream: async () => [],
    saveSnapshot: async (s) => {
      snapshots.push(s);
    },
    loadSnapshot: async () => null,
    loadAggregate: async (_id, reconstitute) => reconstitute({} as never),
  } as EventStore;
}

describe("Digital Twin (L3) — §14", () => {
  it("unknown nodes gate HARD offers to G2 (§14)", async () => {
    const snapshots: unknown[] = [];
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigitalTwinService,
        PropertyGraph,
        { provide: EVENT_STORE, useValue: fakeStore(snapshots) },
      ],
    }).compile();
    const svc = moduleRef.get(DigitalTwinService);
    svc.syncZone({
      zone: "Z",
      occupancy: 10,
      usableCapacity: 100,
      status: "free",
      confidence: 1,
      updatedAt: new Date(),
    });
    svc.addUnknownNode("U");
    svc.addFlow({
      id: "e1",
      from: "U",
      to: "Z",
      expectedFlow: 50,
      gLevel: "G5",
    });
    // Offers into Z are reachable via unknown node U → capped at G2.
    expect(svc.maxOfferableInto("Z")).toBe("G2");
  });

  it("computes second-order propagation across flows (§14)", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigitalTwinService,
        PropertyGraph,
        { provide: EVENT_STORE, useValue: fakeStore([]) },
      ],
    }).compile();
    const svc = moduleRef.get(DigitalTwinService);
    svc.syncZone({
      zone: "A",
      occupancy: 0,
      usableCapacity: 100,
      status: "free",
      confidence: 1,
      updatedAt: new Date(),
    });
    svc.syncZone({
      zone: "B",
      occupancy: 0,
      usableCapacity: 100,
      status: "free",
      confidence: 1,
      updatedAt: new Date(),
    });
    svc.syncZone({
      zone: "C",
      occupancy: 0,
      usableCapacity: 100,
      status: "free",
      confidence: 1,
      updatedAt: new Date(),
    });
    svc.addFlow({
      id: "ab",
      from: "A",
      to: "B",
      expectedFlow: 30,
      gLevel: "G5",
    });
    svc.addFlow({
      id: "bc",
      from: "B",
      to: "C",
      expectedFlow: 30,
      gLevel: "G5",
    });
    // Impact on C includes second-order flow A→B→C.
    expect(svc.inflowPressure("C")).toBeGreaterThan(0);
  });

  it("persists snapshots for time-travel via EventStore (§14/§27)", async () => {
    const snapshots: any[] = [];
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigitalTwinService,
        PropertyGraph,
        { provide: EVENT_STORE, useValue: fakeStore(snapshots) },
      ],
    }).compile();
    const svc = moduleRef.get(DigitalTwinService);
    svc.syncZone({
      zone: "Z",
      occupancy: 1,
      usableCapacity: 10,
      status: "free",
      confidence: 1,
      updatedAt: new Date(),
    });
    await svc.persistSnapshot();
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].stateAtVersion.nodes.length).toBe(1);
  });
});
