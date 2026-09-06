// §12.7 / §9 — unsafe-zone fail-safe + spike detection tests.
import { Test } from "@nestjs/testing";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { UnsafeZoneService } from "./unsafe-zone.service";
import { SpikeDetectionService } from "./spike-detection.service";
import { VerifiedInventoryService } from "./verified-inventory.service";
import { TrustScoringService } from "./trust.service";

function fakeBus(published: unknown[]): EventBus {
  return {
    publish: async (e) => {
      published.push(e);
    },
    subscribe: () => () => {},
    shutdown: async () => {},
  } as EventBus;
}

describe("Unsafe-zone feed (§12.7)", () => {
  let svc: UnsafeZoneService;
  const published: unknown[] = [];
  beforeAll(async () => {
    const m = await Test.createTestingModule({
      providers: [
        UnsafeZoneService,
        TrustScoringService,
        VerifiedInventoryService,
        SpikeDetectionService,
        { provide: EVENT_BUS, useValue: fakeBus(published) },
      ],
    }).compile();
    svc = m.get(UnsafeZoneService);
  });

  it("blocks redirect into a zone with a fresh no_entry overlay (fail-safe)", async () => {
    await svc.applyOverlay({
      zone: "Z",
      kind: "closure",
      validUntil: new Date(Date.now() + 60_000),
      source: "police",
      severity: "no_entry",
    });
    const g = svc.canRedirectInto("Z");
    expect(g.redirectAllowed).toBe(false);
  });

  it("treats a stale overlay as absent but pauses redirects (never assume safe)", async () => {
    await svc.applyOverlay({
      zone: "Y",
      kind: "closure",
      validUntil: new Date(Date.now() - 60_000),
      source: "police",
      severity: "no_entry",
    });
    const g = svc.canRedirectInto("Y", new Date());
    expect(g.paused).toBe(true);
    expect(g.redirectAllowed).toBe(false);
  });

  it("allows redirect into a zone with no active overlay", () => {
    expect(svc.canRedirectInto("SAFE").redirectAllowed).toBe(true);
  });
});

describe("6-layer spike detection (§9)", () => {
  let svc: SpikeDetectionService;
  const published: unknown[] = [];
  beforeAll(async () => {
    const m = await Test.createTestingModule({
      providers: [
        UnsafeZoneService,
        TrustScoringService,
        VerifiedInventoryService,
        SpikeDetectionService,
        { provide: EVENT_BUS, useValue: fakeBus(published) },
      ],
    }).compile();
    svc = m.get(SpikeDetectionService);
  });

  it("does not fire on a cold baseline (<5 obs) — no false alarming", () => {
    for (let i = 0; i < 4; i++) svc.observe("Z", "concert", 100);
    expect(svc.detect("Z", "concert", 500)).toBeNull();
  });

  it("requires ≥2 independent sources for a spike (cross-verification §16.2)", () => {
    svc = new SpikeDetectionService();
    (svc as any).eventBus = fakeBus(published);
    for (let i = 0; i < 10; i++) svc.observe("Z", "concert", 100);
    // only 1 independent source → not cross-verified, z≈3 (<5σ) → blocked
    svc.recordIndependentSource("Z", "turnstile");
    expect(svc.detect("Z", "concert", 115)).toBeNull();
    // second independent source → cross-verified
    svc.recordIndependentSource("Z", "wifi");
    const sig = svc.detect("Z", "concert", 115);
    expect(sig).not.toBeNull();
    expect(sig!.independentSources).toBeGreaterThanOrEqual(2);
  });

  it("a >5σ single source still alerts (layer 2)", () => {
    svc = new SpikeDetectionService();
    (svc as any).eventBus = fakeBus(published);
    for (let i = 0; i < 30; i++) svc.observe("Z", "concert", 100);
    const sig = svc.detect("Z", "concert", 500); // huge deviation
    expect(sig).not.toBeNull();
  });
});

describe("Verified inventory gating (§12.1)", () => {
  it("G5/G3 issuance requires verified inventory", async () => {
    const published: unknown[] = [];
    const m = await Test.createTestingModule({
      providers: [
        VerifiedInventoryService,
        TrustScoringService,
        UnsafeZoneService,
        SpikeDetectionService,
        { provide: EVENT_BUS, useValue: fakeBus(published) },
      ],
    }).compile();
    const vi = m.get(VerifiedInventoryService);
    const r = await vi.verify({
      capacityUnitRef: "hotel:H",
      newState: "CONFIRMED_REALTIME",
      evidence: [{ kind: "reservation_confirmation", ref: "r1" }],
      sourceSystem: "pms",
    });
    expect(r.verified).toBe(true);
    expect(vi.canBackHardToken("hotel:H", true)).toBe(true);
    expect(vi.canBackHardToken("hotel:X", false)).toBe(false);
  });

  it("unverified inventory maps to G2 max issuance", async () => {
    const vi = new VerifiedInventoryService(fakeBus([]));
    expect(vi.maxIssuable(false)).toBe("G2");
    expect(vi.maxIssuable(true)).toBe("G5");
  });
});
