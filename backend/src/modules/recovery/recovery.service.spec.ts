// §27 — Recovery & Resilience unit tests
import { SignedOfflineTokenService } from "./signed-offline-token.service";
import { LastKnownPlanService } from "./last-known-plan.service";
import { signOfflineToken, verifySignedToken } from "../../core/resilience/signed-token";

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  shutdown: jest.fn(),
};

const SECRET = "test-recovery-secret";

describe("SignedOfflineTokenService (§27.1)", () => {
  let service: SignedOfflineTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SignedOfflineTokenService(mockEventBus as never);
  });

  it("issues a signed offline token with validity window", async () => {
    const result = await service.issueOfflineToken({
      tokenId: "tok-1",
      capacityUnitRef: "unit-1",
      attendeeRef: "att-1",
      gLevel: "G5",
      providerRef: "prov-1",
      secret: SECRET,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.held).toBe(true);
      expect(result.value.gLevel).toBe("G5");
      expect(result.value.validUntil.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("verifies an offline token with correct secret", async () => {
    const result = await service.issueOfflineToken({
      tokenId: "tok-2",
      capacityUnitRef: "unit-2",
      attendeeRef: "att-2",
      gLevel: "G3",
      providerRef: "prov-1",
      secret: SECRET,
    });
    const entry = (result as { ok: true; value: { signature: string; payloadJson: string } }).value;

    const verified = service.verifyOfflineToken(
      { signature: entry.signature, payloadJson: entry.payloadJson },
      SECRET,
    );
    expect(verified.valid).toBe(true);
    expect(verified.payload?.tokenId).toBe("tok-2");
  });

  it("rejects offline token with wrong secret", async () => {
    const result = await service.issueOfflineToken({
      tokenId: "tok-3",
      capacityUnitRef: "unit-3",
      attendeeRef: "att-3",
      gLevel: "G2",
      providerRef: "prov-2",
      secret: SECRET,
    });
    const entry = (result as { ok: true; value: { signature: string; payloadJson: string } }).value;

    const verified = service.verifyOfflineToken(
      { signature: entry.signature, payloadJson: entry.payloadJson },
      "wrong-secret",
    );
    expect(verified.valid).toBe(false);
  });

  it("detects expired validity window", async () => {
    await service.issueOfflineToken({
      tokenId: "tok-4",
      capacityUnitRef: "unit-4",
      attendeeRef: "att-4",
      gLevel: "G1",
      providerRef: "prov-3",
      secret: SECRET,
      validityMs: -1, // Immediately expired
    });

    const check = service.checkValidity("tok-4");
    expect(check.valid).toBe(false);
    expect(check.expired).toBe(true);
  });

  it("releases expired token and emits event", async () => {
    await service.issueOfflineToken({
      tokenId: "tok-5",
      capacityUnitRef: "unit-5",
      attendeeRef: "att-5",
      gLevel: "G3",
      providerRef: "prov-4",
      secret: SECRET,
      validityMs: -1,
    });

    const releaseResult = await service.releaseExpiredToken("tok-5");
    expect(releaseResult.ok).toBe(true);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it("caches signature for provider-side verification", async () => {
    await service.issueOfflineToken({
      tokenId: "tok-6",
      capacityUnitRef: "unit-6",
      attendeeRef: "att-6",
      gLevel: "G5",
      providerRef: "prov-5",
      secret: SECRET,
    });

    const cache = service.getSignatureCache("tok-6");
    expect(cache).toBeDefined();
    expect(cache!.tokenState).toBe("held");
    expect(service.isSignatureCacheValid("tok-6")).toBe(true);
  });

  it("returns tokens needing recovery (expired held tokens)", async () => {
    await service.issueOfflineToken({
      tokenId: "tok-7",
      capacityUnitRef: "unit-7",
      attendeeRef: "att-7",
      gLevel: "G3",
      providerRef: "prov-6",
      secret: SECRET,
      validityMs: -1,
    });

    const needsRecovery = service.getTokensForRecovery();
    expect(needsRecovery.length).toBeGreaterThanOrEqual(1);
    expect(needsRecovery.some((t) => t.tokenId === "tok-7")).toBe(true);
  });
});

describe("LastKnownPlanService (§27.3)", () => {
  let service: LastKnownPlanService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LastKnownPlanService(mockEventBus as never);
  });

  it("broadcasts a plan and creates delivery records", async () => {
    const result = await service.broadcast(
      "plan-1",
      "app",
      "New plan: Gate B open",
      "critical",
      ["ops-1", "ops-2"],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const status = service.getDeliveryStatus(result.value.id);
      expect(status.total).toBe(2);
      expect(status.delivered).toBe(0);
    }
  });

  it("records delivery and ack separately", async () => {
    const result = await service.broadcast(
      "plan-2",
      "sms",
      "Gate C evacuation",
      "high",
      ["ops-3"],
    );
    const messageId = (result as { ok: true; value: { id: string } }).value.id;

    service.recordDelivery(messageId, "ops-3");
    let status = service.getDeliveryStatus(messageId);
    expect(status.delivered).toBe(1);
    expect(status.acked).toBe(0);

    service.recordAck(messageId, "ops-3");
    status = service.getDeliveryStatus(messageId);
    expect(status.acked).toBe(1);
    expect(status.pendingAck).toBe(0);
  });

  it("detects missing ack for high-priority messages", async () => {
    // Use a message sent long ago to trigger escalation
    const result = await service.broadcast(
      "plan-3",
      "app",
      "Critical alert",
      "critical",
      ["ops-4"],
    );
    const msg = (result as { ok: true; value: { id: string; sentAt: Date } }).value;

    // Backdate the sentAt to simulate timeout
    (msg as { sentAt: Date }).sentAt = new Date(Date.now() - 60_000);

    const escalations = service.checkEscalations();
    expect(escalations.length).toBeGreaterThanOrEqual(1);
    expect(escalations.some((e) => e.recipientRef === "ops-4")).toBe(true);
  });

  it("does not escalate when ack is received", async () => {
    const result = await service.broadcast(
      "plan-4",
      "pa",
      "Normal update",
      "normal",
      ["ops-5"],
    );
    const msg = (result as { ok: true; value: { id: string; sentAt: Date } }).value;

    // Backdate
    (msg as { sentAt: Date }).sentAt = new Date(Date.now() - 120_000);
    service.recordAck(msg.id, "ops-5");

    const escalations = service.checkEscalations();
    expect(escalations.filter((e) => e.recipientRef === "ops-5").length).toBe(0);
  });

  it("gets messages for a plan", async () => {
    await service.broadcast("plan-5", "web", "Update 1", "normal", []);
    await service.broadcast("plan-5", "app", "Update 2", "high", []);

    const messages = service.getMessagesForPlan("plan-5");
    expect(messages.length).toBe(2);
  });
});
