// §13/§16 — L2 State Estimation + operational independence tests.
import { Test } from "@nestjs/testing";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { FusionService, RobustWeighting } from "./fusion.service";
import { SourceHierarchyService } from "./source-hierarchy";
import { OperationalIndependenceService } from "./operational-independence";
import { StateEstimationService } from "./state-estimation.service";

function fakeBus(published: unknown[]): EventBus {
  return {
    publish: async (e) => {
      published.push(e);
    },
    subscribe: () => () => {},
    shutdown: async () => {},
  } as EventBus;
}

describe("State Estimation (L2) — §13/§16.2", () => {
  async function build() {
    const published: unknown[] = [];
    const moduleRef = await Test.createTestingModule({
      providers: [
        FusionService,
        RobustWeighting,
        SourceHierarchyService,
        OperationalIndependenceService,
        StateEstimationService,
        { provide: EVENT_BUS, useValue: fakeBus(published) },
      ],
    }).compile();
    return {
      fusion: moduleRef.get(FusionService),
      state: moduleRef.get(StateEstimationService),
      indep: moduleRef.get(OperationalIndependenceService),
      published,
    };
  }

  it("emits DataConflict when a source is downweighted (§13.2)", async () => {
    const { fusion, published } = await build();
    await fusion.fuse("Z", [
      {
        sourceId: "s1",
        modality: "turnstile",
        context: "entries",
        value: 100,
        sigma: 2,
      },
      {
        sourceId: "s2",
        modality: "cctv",
        context: "entries",
        value: 95,
        sigma: 2,
      },
      {
        sourceId: "s3",
        modality: "wifi",
        context: "entries",
        value: 400,
        sigma: 2,
      },
    ]);
    const names = published.map((p: any) => p.eventName);
    expect(names).toContain("DataConflict");
  });

  it("conditions the prior on held tokens minus slip (§13.1)", async () => {
    const { fusion } = await build();
    const r = await fusion.fuse(
      "Z",
      [
        {
          sourceId: "s1",
          modality: "turnstile",
          context: "entries",
          value: 100,
          sigma: 50,
        },
      ],
      { heldArrivals: 2400, slipFraction: 0.1 }, // prior ~2160
    );
    expect(r.centralEstimate).toBeGreaterThan(500);
  });

  it("emits CapacityUnitStatusChanged on transition (§13)", async () => {
    const { state, fusion, published } = await build();
    const free = await fusion.fuse("Z", [
      {
        sourceId: "s",
        modality: "turnstile",
        context: "entries",
        value: 10,
        sigma: 1,
      },
    ]);
    const critical = await fusion.fuse("Z", [
      {
        sourceId: "s",
        modality: "turnstile",
        context: "entries",
        value: 1000,
        sigma: 1,
      },
    ]);
    await state.update("Z", free, 200, undefined);
    await state.update("Z", critical, 200, undefined);
    const names = published.map((p: any) => p.eventName);
    expect(
      names.filter((n: string) => n === "CapacityUnitStatusChanged").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("gate + ticket-scan are NOT operationally independent (§16.2)", () => {
    const indep = build0();
    // same modality derived from the same entry → correlated
    expect(
      indep.areIndependent(
        {
          id: "g",
          modality: "gate-counter",
          upstreamDependency: "gate-controller",
        },
        {
          id: "t",
          modality: "ticket-scan",
          upstreamDependency: "gate-controller",
        },
        0.4,
      ),
    ).toBe(false);
  });

  function build0() {
    return new OperationalIndependenceService();
  }

  it("accepts de-correlated independent modalities (§16.2)", () => {
    const indep = new OperationalIndependenceService();
    expect(
      indep.areIndependent(
        {
          id: "g",
          modality: "turnstile",
          upstreamDependency: "gate-controller",
        },
        { id: "w", modality: "wifi", upstreamDependency: "telco" },
        0.1,
      ),
    ).toBe(true);
  });
});
