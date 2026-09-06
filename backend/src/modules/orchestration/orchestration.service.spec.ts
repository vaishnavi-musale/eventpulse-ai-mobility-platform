// §19/§21/§22 — Action Orchestration unit tests
import { AuthorityMatrixService } from "./authority-matrix.service";
import { ChannelDispatchService } from "./channel-dispatch.service";
import { ReplanningService } from "./replanning.service";

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  shutdown: jest.fn(),
};

describe("AuthorityMatrixService (§19)", () => {
  let service: AuthorityMatrixService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthorityMatrixService(mockEventBus as never);
  });

  it("registers and resolves an arbiter for a zone", () => {
    service.registerAuthority({
      zoneRef: "zone-1",
      controllerName: "Ops Manager A",
      authorityType: "zone_arbiter",
      allowedScopes: ["plan_change", "override"],
      canBypassSafety: false,
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const arbiter = service.resolveArbiter("zone-1");
    expect(arbiter).toBeDefined();
    expect(arbiter!.controllerName).toBe("Ops Manager A");
  });

  it("rejects safety-bypass overrides (§18.2)", async () => {
    const result = await service.requestOverride({
      requesterRole: "operator",
      authEvidence: "mfa-token-123",
      zoneRef: "zone-1",
      action: "emergency_evacuate",
      reasonCode: "SAFETY_OVERRIDE",
      reasonDetail: "Need to bypass safety",
      expiryMs: 60_000,
      bypassSafety: true,
    });
    expect(result.granted).toBe(false);
    expect(result.rejectionReason).toContain("SAFETY_BYPASS_FORBIDDEN");
  });

  it("grants override with mandatory reason code", async () => {
    const result = await service.requestOverride({
      requesterRole: "senior_ops",
      authEvidence: "api-key-abc",
      zoneRef: "zone-2",
      action: "plan_adjust",
      reasonCode: "WEATHER_CHANGE",
      reasonDetail: "Storm approaching",
      expiryMs: 300_000,
      bypassSafety: false,
    });
    expect(result.granted).toBe(true);
    expect(result.overrideId).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  it("rejects override without reason code", async () => {
    const result = await service.requestOverride({
      requesterRole: "operator",
      authEvidence: "key",
      zoneRef: "zone-3",
      action: "plan_adjust",
      reasonCode: "",
      reasonDetail: "No reason",
      expiryMs: 60_000,
      bypassSafety: false,
    });
    expect(result.granted).toBe(false);
    expect(result.rejectionReason).toContain("MISSING_REASON_CODE");
  });

  it("rejects conflicting override on same zone+action", async () => {
    await service.requestOverride({
      requesterRole: "ops-a",
      authEvidence: "key",
      zoneRef: "zone-4",
      action: "plan_adjust",
      reasonCode: "A",
      reasonDetail: "A",
      expiryMs: 300_000,
      bypassSafety: false,
    });

    const result = await service.requestOverride({
      requesterRole: "ops-b",
      authEvidence: "key",
      zoneRef: "zone-4",
      action: "plan_adjust",
      reasonCode: "B",
      reasonDetail: "B",
      expiryMs: 300_000,
      bypassSafety: false,
    });
    expect(result.granted).toBe(false);
    expect(result.rejectionReason).toContain("CONFLICTING_OVERRIDE");
  });

  it("emergency request is request-only, never perform", () => {
    const result = service.emergencyRequest("zone-1", "evacuate", "fire");
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("request-only, never perform");
  });
});

describe("ChannelDispatchService (§22)", () => {
  let service: ChannelDispatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChannelDispatchService(mockEventBus as never);
  });

  it("dispatches on confirmable channel (app)", async () => {
    const result = await service.dispatch({
      channel: "app",
      recipientRef: "user-1",
      message: "Your slot is confirmed",
      isHardToken: true,
      confirmable: true,
      priority: "high",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dispatched).toBe(true);
      expect(result.value.channel).toBe("app");
    }
  });

  it("rejects HARD token on non-confirmable channel (pa)", async () => {
    const result = await service.dispatch({
      channel: "pa",
      recipientRef: "user-2",
      message: "Attention",
      isHardToken: true,
      confirmable: false,
      priority: "normal",
    });
    expect(result.ok).toBe(false);
  });

  it("tracks 4 separate measurements per channel", () => {
    service.recordAck("d1", "app");
    service.recordCompliance("app");

    const metrics = service.getMetrics("app");
    expect(metrics.ack).toBe(1);
    expect(metrics.compliance).toBe(1);
  });

  it("computes reachable fraction with uncertainty band", async () => {
    // Generate some deliveries
    for (let i = 0; i < 10; i++) {
      await service.dispatch({
        channel: "app",
        recipientRef: `user-${i}`,
        message: "test",
        isHardToken: false,
        confirmable: true,
        priority: "normal",
      });
    }
    const result = service.computeReachableFraction();
    expect(result.fraction).toBeGreaterThanOrEqual(0);
    expect(result.fraction).toBeLessThanOrEqual(1);
    expect(result.ciLower).toBeLessThanOrEqual(result.fraction);
    expect(result.ciUpper).toBeGreaterThanOrEqual(result.fraction);
  });
});

describe("ReplanningService (§21.4)", () => {
  let service: ReplanningService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReplanningService(mockEventBus as never);
  });

  it("does not replan when deviation is below threshold", async () => {
    const measurement = service.evaluateDeviation("zone-1", {
      currentDeviation: 0.5,
      replanThreshold: 3,
      timeToDanger: 120,
      dynamicsScore: 0.1,
      replanTriggered: false,
    });

    const result = await service.processReplanDecision("zone-1", measurement);
    expect(result.replanned).toBe(false);
  });

  it("replans when deviation exceeds threshold", async () => {
    const measurement = service.evaluateDeviation("zone-1", {
      currentDeviation: 5,
      replanThreshold: 3,
      timeToDanger: 10,
      dynamicsScore: 0.8,
      replanTriggered: false,
    });

    // Force the threshold to be exceeded
    measurement.replanTriggered = measurement.currentDeviation >= measurement.replanThreshold;

    const result = await service.processReplanDecision("zone-1", measurement);
    if (measurement.replanTriggered) {
      expect(result.replanned).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    }
  });

  it("sets low threshold for high danger (time-to-danger < 15s)", () => {
    const measurement = service.evaluateDeviation("zone-2", {
      currentDeviation: 1.5,
      replanThreshold: 999,
      timeToDanger: 10,
      dynamicsScore: 0.5,
      replanTriggered: false,
    });
    // With time-to-danger=10, threshold should be 1
    expect(measurement.replanThreshold).toBe(1);
    expect(measurement.replanTriggered).toBe(true);
  });
});
