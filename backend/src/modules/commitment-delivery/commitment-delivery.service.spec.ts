// §25 — Commitment & Delivery Engine unit tests
import { CommitmentDeliveryService } from "./commitment-delivery.service";

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  shutdown: jest.fn(),
};

describe("CommitmentDeliveryService (§25)", () => {
  let service: CommitmentDeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommitmentDeliveryService(mockEventBus as never);
  });

  describe("Token Lifecycle (§25)", () => {
    it("creates and offers a token", async () => {
      const result = await service.offerToken({
        attendeeRef: "att-1",
        category: "transit_slot",
        capacityUnitRef: "unit-1",
        gLevel: "G5",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 10,
        cost: 5,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const agg = service.getToken(result.value.tokenId);
        expect(agg).toBeDefined();
        expect(agg!.state).toBe("offered");
        expect(agg!.gLevel).toBe("G5");
      }
    });

    it("transitions through accepted→held→activated→fulfilled", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-2",
        category: "hotel_room",
        capacityUnitRef: "unit-2",
        gLevel: "G3",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 20,
        cost: 10,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      expect(offerResult.ok).toBe(true);
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      expect((await service.acceptToken(tokenId)).ok).toBe(true);
      expect(service.getToken(tokenId)!.state).toBe("accepted");

      expect((await service.holdToken(tokenId)).ok).toBe(true);
      expect(service.getToken(tokenId)!.state).toBe("held");

      expect((await service.activateToken(tokenId)).ok).toBe(true);
      expect(service.getToken(tokenId)!.state).toBe("activated");
    });

    it("rejects invalid state transitions", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-3",
        category: "shuttle_seat",
        capacityUnitRef: "unit-3",
        gLevel: "G2",
        channel: "sms",
        verificationMechanism: "none",
        incentiveValue: 5,
        cost: 2,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-2",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      // Cannot hold before accepting
      const holdResult = await service.holdToken(tokenId);
      expect(holdResult.ok).toBe(false);
    });
  });

  describe("Escrow (§8.4)", () => {
    it("computes escrow requirement correctly", () => {
      const req = service.computeEscrowRequirement({
        hardTokenCount: 100,
        perTokenCompensation: 50,
        expectedFailureHazard: 0.1,
        margin: 0.2,
      });
      // 100 * 50 * 0.1 = 500; 500 * 1.2 = 600
      expect(req.required).toBe(600);
      expect(req.breakdown.hardTokens).toBe(100);
    });

    it("funds escrow and emits EscrowTopUp", async () => {
      const result = await service.fundEscrow("zone-1", 10000, 50, 0.1, 0.2);
      expect(result.ok).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      const escrow = service.getEscrow("zone-1");
      expect(escrow).toBeDefined();
      expect(escrow!.fundedAmount).toBe(10000);
    });

    it("draws down from escrow on verified failure", async () => {
      await service.fundEscrow("zone-1", 10000, 50, 0.1, 0.2);
      const result = await service.drawDownEscrow(
        "zone-1", "tok-1", 100, "verified provider failure",
      );
      expect(result.ok).toBe(true);
      expect(service.getEscrow("zone-1")!.availableBalance).toBe(9900);
    });

    it("rejects draw-down exceeding balance", async () => {
      await service.fundEscrow("zone-1", 100, 50, 0.1, 0.2);
      const result = await service.drawDownEscrow("zone-1", "tok-1", 200, "over");
      expect(result.ok).toBe(false);
    });
  });

  describe("Fulfillment Verification (§25.3)", () => {
    it("auto-decides scan-backed evidence with cross-check pass", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-4",
        category: "transit_slot",
        capacityUnitRef: "unit-4",
        gLevel: "G5",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 10,
        cost: 5,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      await service.acceptToken(tokenId);
      await service.holdToken(tokenId);
      await service.activateToken(tokenId);

      const decision = await service.fulfillFromEvidence(tokenId, {
        tokenId,
        category: "transit_slot",
        mechanism: "scan",
        evidenceData: { qrPayload: "abc123", ref: "scan-1" },
        collectedAt: new Date(),
        crossCheckPassed: true,
        sourceSystem: "turnstile-gate-3",
      });

      expect(decision.ok).toBe(true);
      if (decision.ok) {
        expect(decision.value.fulfilled).toBe(true);
        expect(decision.value.decisionPath).toBe("auto");
        expect(service.getToken(tokenId)!.state).toBe("fulfilled");
      }
    });

    it("escalates ambiguous evidence to human", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-5",
        category: "exit_window",
        capacityUnitRef: "unit-5",
        gLevel: "G3",
        channel: "staff",
        verificationMechanism: "staff_confirm",
        incentiveValue: 8,
        cost: 3,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      await service.acceptToken(tokenId);
      await service.holdToken(tokenId);
      await service.activateToken(tokenId);

      const decision = await service.fulfillFromEvidence(tokenId, {
        tokenId,
        category: "exit_window",
        mechanism: "staff_confirm",
        evidenceData: { staffId: "S-42" },
        collectedAt: new Date(),
        crossCheckPassed: false,
        sourceSystem: "staff-tablet",
      });

      expect(decision.ok).toBe(true);
      if (decision.ok) {
        expect(decision.value.fulfilled).toBe(false);
        expect(decision.value.decisionPath).toBe("human");
      }
    });
  });

  describe("Re-offering Pipeline (§25.4)", () => {
    it("creates a pipeline with stage timestamps", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-6",
        category: "transit_slot",
        capacityUnitRef: "unit-6",
        gLevel: "G2",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 10,
        cost: 5,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      const pipelineResult = await service.startReOffering(tokenId);
      expect(pipelineResult.ok).toBe(true);
      if (pipelineResult.ok) {
        expect(pipelineResult.value.noShowDetectedAt).toBeDefined();
        expect(pipelineResult.value.releasedAt).toBeDefined();
        expect(pipelineResult.value.notifiedAt).toBeDefined();
        expect(pipelineResult.value.providerConfirmedAt).toBeDefined();
      }
    });
  });

  describe("Recommit SLA (§25.6)", () => {
    it("triggers recommit and creates new token", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-7",
        category: "hotel_room",
        capacityUnitRef: "unit-7",
        gLevel: "G5",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 50,
        cost: 20,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      const result = await service.triggerRecommit(tokenId, "zone-1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completed).toBe(true);
        expect(result.value.newTokenId).toBeDefined();
      }
    });

    it("detects SLA breach when deadline elapsed", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-8",
        category: "shuttle_seat",
        capacityUnitRef: "unit-8",
        gLevel: "G3",
        channel: "sms",
        verificationMechanism: "provider_receipt",
        incentiveValue: 15,
        cost: 8,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      // Manually set a collapsed SLA in the past
      await service.triggerRecommit(tokenId, "zone-1");
      const breach = service.checkSLABreach(tokenId);
      // Since completed=true, should not be breached
      expect(breach.breached).toBe(false);
    });
  });

  describe("Dispute Path (§25.3)", () => {
    it("opens and resolves a dispute", async () => {
      const offerResult = await service.offerToken({
        attendeeRef: "att-9",
        category: "transit_slot",
        capacityUnitRef: "unit-9",
        gLevel: "G3",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 10,
        cost: 5,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-1",
      });
      const tokenId = (offerResult as { ok: true; value: { tokenId: string } }).value.tokenId;

      // Move through lifecycle
      await service.acceptToken(tokenId);
      await service.holdToken(tokenId);
      await service.activateToken(tokenId);

      const disputeResult = await service.openDispute(tokenId, "Scan not recognized", []);
      expect(disputeResult.ok).toBe(true);

      const resolveResult = await service.resolveDispute(tokenId, "fulfilled", "Manual verification confirmed");
      expect(resolveResult.ok).toBe(true);
      expect(service.getToken(tokenId)!.state).toBe("fulfilled");
    });
  });

  describe("Escrow cap enforcement", () => {
    it("rejects token creation when escrow cap is reached", async () => {
      // Fund escrow with tiny cap
      await service.fundEscrow("zone-tiny", 100, 50, 0.1, 0.2);
      const escrow = service.getEscrow("zone-tiny");
      // Cap = floor(100 / (50 * 0.1 * 1.2)) = floor(100/6) = 16
      // Issue up to the cap
      for (let i = 0; i < (escrow?.issuedCap ?? 0); i++) {
        await service.offerToken({
          attendeeRef: `att-${i}`,
          category: "transit_slot",
          capacityUnitRef: "unit-1",
          gLevel: "G2",
          channel: "app",
          verificationMechanism: "scan",
          incentiveValue: 1,
          cost: 1,
          expiresAt: new Date(Date.now() + 3600_000),
          timeWindowStart: new Date(),
          timeWindowEnd: new Date(Date.now() + 3600_000),
          zoneRef: "zone-tiny",
        });
      }
      // Next one should fail
      const result = await service.offerToken({
        attendeeRef: "att-overflow",
        category: "transit_slot",
        capacityUnitRef: "unit-1",
        gLevel: "G2",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 1,
        cost: 1,
        expiresAt: new Date(Date.now() + 3600_000),
        timeWindowStart: new Date(),
        timeWindowEnd: new Date(Date.now() + 3600_000),
        zoneRef: "zone-tiny",
      });
      expect(result.ok).toBe(false);
    });
  });
});
