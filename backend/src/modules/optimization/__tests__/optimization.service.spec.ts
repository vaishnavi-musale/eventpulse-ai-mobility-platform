// §18 — L6 Optimization unit tests
import { checkPhysicalInventory, isPhysicallyFeasible } from "../feasibility/physical-inventory.checker";
import { buildSafetyConstraintSet, assembleConstraintSet } from "../feasibility/safety-constraint.set";
import { greedyFallback, forcedGreedyTimeoutTest } from "../solvers/greedy-fallback";
import { evaluateChanceConstraint } from "../solvers/chance-constraint";
import { evaluateFairnessConstraints, computeGroupServiceLevels } from "../fairness/fairness.constraint";
import { checkAntiHoarding, canIssueToken } from "../anti-hoarding/anti-hoarding.service";
import { computeParetoFront, elicitPreferences } from "../pareto/pareto-front.service";
import type { CapacityUnit } from "@core/domain/capacity-unit";
import type { CommitmentToken } from "@core/domain/commitment-token";
import type { GLevel } from "@core/domain/g-level.enum";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { PlanAllocation } from "../types/plan.types";

// --- Test fixtures ---
function makeCapacityUnit(overrides: Partial<CapacityUnit> = {}): CapacityUnit {
  return {
    id: "cu-1",
    type: "metro_platform",
    geoZone: "zone-1",
    contractCapacity: 500,
    overbookHeadroomP50: 0.1,
    savedSafetyBuffer: 50,
    usableCapacity: 450,
    reserveCapacity: 25,
    currentOccupancy: 100,
    status: "free",
    bufferProfile: "metro",
    holdComfort: 200,
    lastUpdated: new Date(),
    sourceSystem: "test",
    confidence: 0.9,
    committedSlots: 50,
    availableCommitments: 450,
    verifiedInventory: true,
    verificationState: "CONFIRMED_REALTIME",
    ...overrides,
  };
}

function makeZone(overrides: Partial<SimulationZone> = {}): SimulationZone {
  return {
    id: "zone-1",
    label: "Test Zone",
    geometry: {
      areaM2: 1000,
      perimeterM: 200,
      egressWidthM: 4,
      egressCount: 2,
      type: "metro_platform",
    },
    capacityUnits: [makeCapacityUnit()],
    densityLimit: 4,
    egressTargetP95: 15,
    holdComfort: 200,
    holdTimeLimit: 30,
    floorCapacity: 50,
    emergencyAccessRequired: true,
    ...overrides,
  };
}

function makeAllocation(
  overrides: Partial<PlanAllocation> = {},
): PlanAllocation {
  return {
    id: "alloc-1",
    zoneId: "zone-1",
    capacityUnitRef: "cu-1",
    resourceType: "metro_platform",
    gLevel: "G3",
    attendeeCount: 300,
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 30 * 60000),
    isGift: false,
    ...overrides,
  };
}

function makeToken(overrides: Partial<CommitmentToken> = {}): CommitmentToken {
  return {
    id: "token-1",
    attendeeRef: "attendee-1",
    category: "transit_slot",
    capacityUnitRef: "cu-1",
    timeWindowStart: new Date(),
    timeWindowEnd: new Date(Date.now() + 3600000),
    gLevel: "G3",
    state: "held",
    incentiveValue: 10,
    cost: 5,
    channel: "app",
    cancelPolicy: "24h",
    expiresAt: new Date(Date.now() + 3600000),
    verificationMechanism: "scan",
    commitmentLedgerRef: "ledger-1",
    version: 1,
    ...overrides,
  };
}

describe("§18 Optimization Engine", () => {
  describe("§18.1 — physical_inventory_exists (hard feasibility)", () => {
    it("passes when allocation <= verified inventory", () => {
      const cu = makeCapacityUnit({
        usableCapacity: 500,
        verifiedInventory: true,
        verificationState: "CONFIRMED_REALTIME",
      });
      const alloc = makeAllocation({ attendeeCount: 300 });
      const result = isPhysicallyFeasible([alloc], [cu]);
      expect(result.feasible).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("fails when allocation > verified inventory", () => {
      const cu = makeCapacityUnit({
        usableCapacity: 200,
        verifiedInventory: true,
        verificationState: "CONFIRMED_REALTIME",
      });
      const alloc = makeAllocation({ attendeeCount: 300 });
      const result = isPhysicallyFeasible([alloc], [cu]);
      expect(result.feasible).toBe(false);
      expect(result.violations.some((v) => v.includes("exceeds_verified"))).toBe(
        true,
      );
    });

    it("fails when exceeding contracted inventory", () => {
      const cu = makeCapacityUnit({
        contractCapacity: 250,
        usableCapacity: 200,
        verifiedInventory: true,
      });
      const alloc = makeAllocation({ attendeeCount: 300 });
      const result = isPhysicallyFeasible([alloc], [cu]);
      expect(result.feasible).toBe(false);
      expect(
        result.violations.some((v) => v.includes("exceeds_contracted")),
      ).toBe(true);
    });

    it("detects no physical inventory", () => {
      const cu = makeCapacityUnit({
        verifiedInventory: false,
        verificationState: "MANUAL",
      });
      const alloc = makeAllocation({ attendeeCount: 100 });
      const checks = checkPhysicalInventory([alloc], [cu]);
      expect(checks[0].physicalInventoryExists).toBe(false);
    });
  });

  describe("§18.2 — Safety constraint set violation detection", () => {
    it("detects density violation", () => {
      const zone = makeZone({
        densityLimit: 2, // very low limit
        geometry: { areaM2: 100, perimeterM: 40, egressWidthM: 3, egressCount: 2, type: "venue_hall" },
      });
      const alloc = makeAllocation({ attendeeCount: 300 });
      const constraints = buildSafetyConstraintSet([zone], [alloc]);
      const densityConstraint = constraints.find(
        (c) => c.type === "density_limit",
      );
      expect(densityConstraint).toBeDefined();
      expect(densityConstraint!.satisfied).toBe(false);
      expect(densityConstraint!.residual).toBeLessThan(0);
    });

    it("all 6 constraint types are generated", () => {
      const zone = makeZone();
      const alloc = makeAllocation();
      const constraints = buildSafetyConstraintSet([zone], [alloc]);
      const types = constraints.map((c) => c.type);
      expect(types).toContain("density_limit");
      expect(types).toContain("egress_p95");
      expect(types).toContain("hold_comfort_time");
      expect(types).toContain("vulnerable_group_egress");
      expect(types).toContain("no_unsafe_zone");
      expect(types).toContain("emergency_veh_access");
    });

    it("all constraints are HARD severity", () => {
      const zone = makeZone();
      const alloc = makeAllocation();
      const constraints = buildSafetyConstraintSet([zone], [alloc]);
      for (const c of constraints) {
        expect(c.severity).toBe("HARD");
      }
    });

    it("assembles constraint set with counts", () => {
      const zone = makeZone();
      const alloc = makeAllocation();
      const constraints = buildSafetyConstraintSet([zone], [alloc]);
      const set = assembleConstraintSet(constraints);
      expect(set.totalConstraints).toBe(constraints.length);
      expect(set.satisfiedCount + set.violatedCount).toBe(
        set.totalConstraints,
      );
    });
  });

  describe("§18.3 — Chance constraint", () => {
    it("evaluates and returns probability with CI", () => {
      const zone = makeZone();
      const alloc = makeAllocation();
      const result = evaluateChanceConstraint(
        [alloc],
        [zone],
        ["metro_platform"],
        4,
        100,
        42,
      );
      expect(result.targetViolationProbability).toBe(0.1);
      expect(result.samplingMode).toBe("joint");
      expect(result.jointFactors.demand).toBe(true);
      expect(result.jointFactors.compliance).toBe(true);
      expect(result.jointFactors.capacity).toBe(true);
      expect(result.simulatedProbability.ciLower).toBeDefined();
      expect(result.simulatedProbability.ciUpper).toBeDefined();
    });
  });

  describe("§18.4 — Greedy fallback never overcommits", () => {
    it("does not overcommit inventory under normal conditions", () => {
      const cu = makeCapacityUnit({ usableCapacity: 200 });
      const zone = makeZone({ capacityUnits: [cu] });
      // Greedy allocates up to usableCapacity per window
      const result = forcedGreedyTimeoutTest(
        1000,
        [zone],
        [cu],
        60,
      );
      // Each window allocation should be <= usableCapacity
      for (const alloc of result.plan.allocations) {
        expect(alloc.attendeeCount).toBeLessThanOrEqual(cu.usableCapacity);
      }
      expect(result.overcommitted).toBe(false);
    });

    it("respects density limits", () => {
      const zone = makeZone({
        densityLimit: 1, // 1 person per m²
        geometry: { areaM2: 100, perimeterM: 40, egressWidthM: 10, egressCount: 4, type: "venue_hall" },
      });
      const cu = makeCapacityUnit({ usableCapacity: 5000 });
      const plan = greedyFallback(1000, [zone], [cu], 60);
      // Should be limited by density per window: 1 * 100 = 100 per window
      // With 2 windows, total can be up to 200
      const totalAllocated = plan.allocations.reduce(
        (s, a) => s + a.attendeeCount,
        0,
      );
      expect(totalAllocated).toBeLessThanOrEqual(200);
    });

    it("only opens SOFT gifts (G≤2)", () => {
      const cu = makeCapacityUnit({ usableCapacity: 500 });
      const zone = makeZone({ capacityUnits: [cu] });
      const plan = greedyFallback(300, [zone], [cu], 60);
      for (const alloc of plan.allocations) {
        // G2, G1, G0 are soft gifts; G5, G3 are not
        if (alloc.isGift) {
          expect(["G2", "G1", "G0"]).toContain(alloc.gLevel);
        }
      }
    });

    it("forced timeout test proves no overcommitment", () => {
      const cu = makeCapacityUnit({ usableCapacity: 300 });
      const zone = makeZone({ capacityUnits: [cu] });
      const result = forcedGreedyTimeoutTest(1000, [zone], [cu], 120);
      expect(result.overcommitted).toBe(false);
      // Plan should exist
      expect(result.plan).toBeDefined();
      expect(result.plan.allocations.length).toBeGreaterThan(0);
    });
  });

  describe("§18.5 — Fairness (protected groups only)", () => {
    it("evaluates service levels for self-declared groups", () => {
      const result = evaluateFairnessConstraints(
        {
          protectedGroups: [
            { groupId: "wheelchair_users", size: 50 },
            { groupId: "elderly", size: 100 },
          ],
          globalMinServiceLevel: 0.8,
          safetySatisfied: true,
        },
        new Map([
          ["wheelchair_users", 0.9],
          ["elderly", 0.7],
        ]),
      );
      expect(result.constraints).toHaveLength(2);
      expect(result.constraints[0].satisfied).toBe(true);
      expect(result.constraints[1].satisfied).toBe(false);
    });

    it("safety overrides fairness when both violated", () => {
      const result = evaluateFairnessConstraints(
        {
          protectedGroups: [{ groupId: "group-1", size: 50 }],
          globalMinServiceLevel: 0.8,
          safetySatisfied: false,
        },
        new Map([["group-1", 0.5]]),
      );
      expect(result.constraints[0].safetyOverridden).toBe(true);
      expect(result.tensions).toHaveLength(1);
      expect(result.tensions[0].resolution).toBe("safety_wins");
    });

    it("no proxy inference — only self-declared groups", () => {
      const result = evaluateFairnessConstraints(
        {
          protectedGroups: [], // no groups declared
          globalMinServiceLevel: 0.8,
          safetySatisfied: true,
        },
        new Map(),
      );
      expect(result.constraints).toHaveLength(0);
    });
  });

  describe("§18.6 — Anti-hoarding", () => {
    it("detects multiple active G≥2 tokens per category per attendee", () => {
      const tokens = [
        makeToken({ attendeeRef: "a1", category: "transit_slot", gLevel: "G3" }),
        makeToken({
          id: "token-2",
          attendeeRef: "a1",
          category: "transit_slot",
          gLevel: "G2",
        }),
      ];
      const constraints = checkAntiHoarding(tokens);
      expect(constraints).toHaveLength(1);
      expect(constraints[0].activeHighGTokenCount).toBe(2);
      expect(constraints[0].satisfied).toBe(false);
    });

    it("allows one G≥2 token per category per attendee", () => {
      const tokens = [
        makeToken({ attendeeRef: "a1", category: "transit_slot", gLevel: "G3" }),
      ];
      const constraints = checkAntiHoarding(tokens);
      expect(constraints[0].satisfied).toBe(true);
    });

    it("canIssueToken rejects when constraint would be violated", () => {
      const existing = [
        makeToken({ attendeeRef: "a1", category: "transit_slot", gLevel: "G3" }),
      ];
      const newToken = makeToken({
        id: "token-new",
        attendeeRef: "a1",
        category: "transit_slot",
        gLevel: "G2",
      });
      const result = canIssueToken(existing, newToken);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Anti-hoarding violation");
    });

    it("canIssueToken allows when no conflict", () => {
      const existing = [
        makeToken({ attendeeRef: "a1", category: "transit_slot", gLevel: "G3" }),
      ];
      const newToken = makeToken({
        id: "token-new",
        attendeeRef: "a2", // different attendee
        category: "transit_slot",
        gLevel: "G2",
      });
      const result = canIssueToken(existing, newToken);
      expect(result.allowed).toBe(true);
    });
  });

  describe("§18.7 — Pareto front", () => {
    it("returns non-dominated plans", () => {
      const plans = [
        {
          id: "p1",
          label: "Plan 1",
          allocations: [],
          totalAttendees: 100,
          planningHorizonMinutes: 60,
          committedTokens: [],
          activeConstraints: [],
          satisfiedConstraints: [],
          constraintResiduals: {},
          objectiveValue: 100,
          feasible: true,
        },
        {
          id: "p2",
          label: "Plan 2",
          allocations: [],
          totalAttendees: 200,
          planningHorizonMinutes: 60,
          committedTokens: [],
          activeConstraints: [],
          satisfiedConstraints: [],
          constraintResiduals: {},
          objectiveValue: 200,
          feasible: true,
        },
        {
          id: "p3",
          label: "Plan 3",
          allocations: [],
          totalAttendees: 150,
          planningHorizonMinutes: 60,
          committedTokens: [],
          activeConstraints: [],
          satisfiedConstraints: [],
          constraintResiduals: {},
          objectiveValue: 150,
          feasible: true,
        },
      ];
      const front = computeParetoFront(plans, 5);
      expect(front.plans.length).toBeGreaterThan(0);
      expect(front.plans.length).toBeLessThanOrEqual(5);
      // Pareto front should contain the best plan
      expect(front.plans.some((p) => p.id === "p2")).toBe(true);
    });

    it("elicitPreferences returns defaults", () => {
      const prefs = elicitPreferences();
      expect(prefs.servedWeight + prefs.safetyWeight + prefs.fairnessWeight + prefs.costWeight).toBeCloseTo(1.0);
    });
  });
});
