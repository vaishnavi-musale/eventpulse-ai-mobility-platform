// §6/§44 — Guarantee Ladder Manager unit tests
import { GuaranteeLadderService } from "./guarantee-ladder.service";
import { GLevel, G_LADDER_INDEX } from "../../core/domain/g-level.enum";
import { OperatingMode } from "../../core/domain/operating-mode.enum";
import { GLinkStatus } from "./types";

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  shutdown: jest.fn(),
};

function makeLinks(overrides: Partial<GLinkStatus> = {}): GLinkStatus {
  return {
    inventoryVerified: true,
    escrowFunded: true,
    verificationChannelUp: true,
    operatingMode: OperatingMode.NORMAL,
    ...overrides,
  };
}

describe("GuaranteeLadderService (§6/§44)", () => {
  let service: GuaranteeLadderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GuaranteeLadderService(mockEventBus as never);
  });

  describe("computeGLevel — §6.2 deterministic degradation", () => {
    it("computes G5 when all links are satisfied", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks(),
      });
      expect(result.computedLevel).toBe("G5");
      expect(result.degradeChain).toEqual([]);
    });

    it("degrades G5→G2 when inventory is not verified (G3 also fails)", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks({ inventoryVerified: false }),
      });
      // G5 fails (needs verified inventory), G3 also fails (needs verified inventory),
      // G2 passes (only needs channel up)
      expect(result.computedLevel).toBe("G2");
      expect(result.degradeChain).toContain("G5");
    });

    it("degrades G5→G1 when inventory unverified AND channel down", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks({ inventoryVerified: false, verificationChannelUp: false }),
      });
      // Inventory not verified → G5 fails, G3 fails (needs verified inv + channel),
      // G2 fails (needs channel), G1 is valid
      expect(result.computedLevel).toBe("G1");
      expect(result.degradeChain).toContain("G5");
    });

    it("degrades G5→G1 when all links are broken in EMERGENCY mode", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks({
          inventoryVerified: false,
          escrowFunded: false,
          verificationChannelUp: false,
          operatingMode: OperatingMode.EMERGENCY,
        }),
      });
      // EMERGENCY mode caps at G1; G1 is always valid
      expect(result.computedLevel).toBe("G1");
      expect(result.degradeChain).toContain("G5");
    });

    it("respects DEGRADED mode ceiling (G≤2)", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks({ operatingMode: OperatingMode.DEGRADED }),
      });
      expect(G_LADDER_INDEX[result.computedLevel]).toBeGreaterThanOrEqual(G_LADDER_INDEX["G2"]);
    });

    it("respects EMERGENCY mode ceiling (G≤1)", () => {
      const result = service.computeGLevel({
        requestedLevel: "G5",
        links: makeLinks({ operatingMode: OperatingMode.EMERGENCY }),
      });
      expect(G_LADDER_INDEX[result.computedLevel]).toBeGreaterThanOrEqual(G_LADDER_INDEX["G1"]);
    });

    it("never upgrades a degraded token", () => {
      const result = service.computeGLevel({
        requestedLevel: "G2",
        links: makeLinks(),
      });
      // G2 requested, all links up → G2 is valid, but should not become G5
      expect(result.computedLevel).toBe("G2");
    });

    it("G0 always computes as G0 regardless of links", () => {
      const result = service.computeGLevel({
        requestedLevel: "G0",
        links: makeLinks(),
      });
      expect(result.computedLevel).toBe("G0");
    });
  });

  describe("enforceForbids — §6.3", () => {
    it("rejects G5 where inventory is not verified", () => {
      const result = service.enforceForbids({
        gLevel: "G5",
        inventoryVerified: false,
        channelConfirmable: true,
        avgGLevel: 2,
        labeledAsManaged: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.violation).toContain("verified inventory");
    });

    it("rejects G3 where inventory is not verified", () => {
      const result = service.enforceForbids({
        gLevel: "G3",
        inventoryVerified: false,
        channelConfirmable: true,
        avgGLevel: 2,
        labeledAsManaged: false,
      });
      expect(result.allowed).toBe(false);
    });

    it("rejects HARD token where delivery channel is not confirmable", () => {
      const result = service.enforceForbids({
        gLevel: "G5",
        inventoryVerified: true,
        channelConfirmable: false,
        avgGLevel: 2,
        labeledAsManaged: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.violation).toContain("confirmable delivery channel");
    });

    it("rejects guaranteed flow where avg G ≤ G1", () => {
      const result = service.enforceForbids({
        gLevel: "G5",
        inventoryVerified: true,
        channelConfirmable: true,
        avgGLevel: G_LADDER_INDEX["G1"],
        labeledAsManaged: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.violation).toContain("avg G");
    });

    it("rejects G0 labeled as managed", () => {
      const result = service.enforceForbids({
        gLevel: "G0",
        inventoryVerified: false,
        channelConfirmable: false,
        avgGLevel: 0,
        labeledAsManaged: true,
      });
      expect(result.allowed).toBe(false);
      expect(result.violation).toContain("G0");
    });

    it("allows valid G2 soft hold", () => {
      const result = service.enforceForbids({
        gLevel: "G2",
        inventoryVerified: false,
        channelConfirmable: true,
        avgGLevel: 2,
        labeledAsManaged: false,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("enforceModeCoupling — §26.1", () => {
    it("NORMAL allows G5", () => {
      const result = service.enforceModeCoupling(OperatingMode.NORMAL, "G5");
      expect(result.allowed).toBe(true);
    });

    it("DEGRADED rejects G5, allows G2", () => {
      expect(service.enforceModeCoupling(OperatingMode.DEGRADED, "G5").allowed).toBe(false);
      expect(service.enforceModeCoupling(OperatingMode.DEGRADED, "G2").allowed).toBe(true);
    });

    it("EMERGENCY rejects G2+, allows G1", () => {
      expect(service.enforceModeCoupling(OperatingMode.EMERGENCY, "G2").allowed).toBe(false);
      expect(service.enforceModeCoupling(OperatingMode.EMERGENCY, "G1").allowed).toBe(true);
    });

    it("PLATFORM_DEGRADED rejects G2+, allows G1", () => {
      expect(service.enforceModeCoupling(OperatingMode.PLATFORM_DEGRADED, "G3").allowed).toBe(false);
      expect(service.enforceModeCoupling(OperatingMode.PLATFORM_DEGRADED, "G1").allowed).toBe(true);
    });
  });

  describe("evaluateTransition — degradation emits TokenDowngraded", () => {
    it("emits TokenDowngraded when links break", async () => {
      await service.evaluateTransition("tok-1", "G5", makeLinks({ inventoryVerified: false }), 1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.eventName).toBe("TokenDowngraded");
      expect(event.payload.fromLevel).toBe("G5");
    });

    it("does not emit when no degradation", async () => {
      await service.evaluateTransition("tok-2", "G5", makeLinks(), 1);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe("computeAtIssuance — §6 issuance", () => {
    it("computes G5 + passes forbids when all links satisfied", () => {
      const result = service.computeAtIssuance("G5", makeLinks(), 4, true);
      expect(result.computedLevel).toBe("G5");
      expect(result.forbidResult.allowed).toBe(true);
    });

    it("degrades and fails forbids when inventory unverified", () => {
      // avgGLevel=1 (at or below G1) triggers the no-guaranteed-flow forbid
      const result = service.computeAtIssuance("G5", makeLinks({ inventoryVerified: false }), 1, true);
      expect(result.computedLevel).toBe("G2");
    });

    it("caps at mode ceiling in DEGRADED mode", () => {
      const result = service.computeAtIssuance("G5", makeLinks({ operatingMode: OperatingMode.DEGRADED }), 4, true);
      expect(G_LADDER_INDEX[result.computedLevel]).toBeGreaterThanOrEqual(G_LADDER_INDEX["G2"]);
    });
  });
});
