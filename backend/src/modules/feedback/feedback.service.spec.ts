// §20/§21/§30 — Feedback & Learning unit tests
import { EvidenceTaxonomyService } from "./evidence-taxonomy.service";
import { ProviderReputationService } from "./provider-reputation.service";
import { ProviderStarvationWatchService } from "./starvation-watch.service";
import { CalibrationFeedbackService } from "./calibration-feedback.service";
import { UserEquilibriumGuardService } from "./user-equilibrium.service";

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  shutdown: jest.fn(),
};

describe("EvidenceTaxonomyService (§20)", () => {
  let service: EvidenceTaxonomyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvidenceTaxonomyService(mockEventBus as never);
  });

  it("records a valid observational outcome", () => {
    const result = service.validateAndRecord({
      providerRef: "prov-1",
      zoneRef: "zone-1",
      tier: "O",
      metric: "fulfillment_rate",
      value: 0.95,
      sampleSize: 100,
      observedAt: new Date(),
      isHoldout: false,
      context: {},
    });
    expect(result.ok).toBe(true);
  });

  it("records a simulated outcome as S tier", () => {
    const result = service.validateAndRecord({
      providerRef: "prov-1",
      zoneRef: "zone-1",
      tier: "S",
      metric: "predicted_demand",
      value: 500,
      sampleSize: 0,
      observedAt: new Date(),
      isHoldout: false,
      context: {},
    });
    expect(result.ok).toBe(true);
    // S tier outcomes should be retrievable as S
    const sOutcomes = service.getOutcomesByTier("S");
    expect(sOutcomes.length).toBe(1);
  });

  it("rejects invalid evidence tier", () => {
    const result = service.validateAndRecord({
      providerRef: "prov-1",
      zoneRef: "zone-1",
      tier: "X" as never,
      metric: "test",
      value: 0,
      sampleSize: 1,
      observedAt: new Date(),
      isHoldout: false,
      context: {},
    });
    expect(result.ok).toBe(false);
  });

  it("creates and manages holdout groups", () => {
    const holdout = service.createHoldout(0.1, ["fulfillment_rate"], true);
    expect(holdout.holdoutFraction).toBe(0.1);
    expect(holdout.fairnessGuarded).toBe(true);

    expect(service.getActiveHoldouts().length).toBe(1);
    service.endHoldout(holdout.id);
    expect(service.getActiveHoldouts().length).toBe(0);
  });

  it("S tier is never reported as O/A/C", () => {
    // The service validates that S is only used as S tier
    const sResult = service.validateAndRecord({
      providerRef: "prov-1",
      zoneRef: "zone-1",
      tier: "S",
      metric: "sim_result",
      value: 1,
      sampleSize: 0,
      observedAt: new Date(),
      isHoldout: false,
      context: {},
    });
    expect(sResult.ok).toBe(true);

    // Verify S outcomes are only in S tier
    const oOutcomes = service.getOutcomesByTier("O");
    const aOutcomes = service.getOutcomesByTier("A");
    const cOutcomes = service.getOutcomesByTier("C");
    const sOutcomes = service.getOutcomesByTier("S");
    expect(oOutcomes.length).toBe(0);
    expect(aOutcomes.length).toBe(0);
    expect(cOutcomes.length).toBe(0);
    expect(sOutcomes.length).toBe(1);
  });
});

describe("ProviderReputationService (§20.3)", () => {
  let service: ProviderReputationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderReputationService(mockEventBus as never);
  });

  it("initializes reputation with score 1.0", () => {
    const rep = service.getReputation("prov-1");
    expect(rep.score).toBe(1.0);
    expect(rep.priorityGated).toBe(false);
  });

  it("adjudicates platform-induced failure (no penalty)", async () => {
    await service.adjudicateFailure("prov-1", {
      platformInduced: true,
      rootCause: "bad_assignment",
      confidence: 0.9,
      evidenceRefs: ["ev-1"],
    });
    const rep = service.getReputation("prov-1");
    expect(rep.platformInducedFailures).toBe(1);
    expect(rep.failureCount).toBe(0);
    expect(rep.score).toBe(1.0);
  });

  it("adjudicates provider-fault failure (penalty applied)", async () => {
    await service.adjudicateFailure("prov-2", {
      platformInduced: false,
      rootCause: "provider_fault",
      confidence: 0.85,
      evidenceRefs: ["ev-2"],
    });
    const rep = service.getReputation("prov-2");
    expect(rep.failureCount).toBe(1);
    expect(rep.score).toBeLessThan(1.0);
  });

  it("gates priority when score drops below threshold", async () => {
    // 10 failures, 0 successes
    for (let i = 0; i < 10; i++) {
      await service.adjudicateFailure("prov-3", {
        platformInduced: false,
        rootCause: "provider_fault",
        confidence: 0.9,
        evidenceRefs: [],
      });
    }
    expect(service.isPriorityGated("prov-3")).toBe(true);
  });

  it("does not gate when failures are platform-induced", async () => {
    for (let i = 0; i < 10; i++) {
      await service.adjudicateFailure("prov-4", {
        platformInduced: true,
        rootCause: "hoarding",
        confidence: 0.9,
        evidenceRefs: [],
      });
    }
    expect(service.isPriorityGated("prov-4")).toBe(false);
  });
});

describe("ProviderStarvationWatchService (§20.5)", () => {
  let service: ProviderStarvationWatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderStarvationWatchService(mockEventBus as never);
  });

  it("computes HHI and detects concentration", () => {
    // Monopoly: one provider has 100%
    const mono = service.computeConcentrationIndex("zone-1", { provA: 1.0 });
    expect(mono.hhi).toBe(1.0);
    expect(mono.explorationAdded).toBe(true);

    // Perfect competition: 4 providers with 25% each
    const comp = service.computeConcentrationIndex("zone-2", {
      provA: 0.25,
      provB: 0.25,
      provC: 0.25,
      provD: 0.25,
    });
    expect(comp.hhi).toBe(0.25);
    expect(comp.explorationAdded).toBe(false);
  });

  it("triggers exploration when threshold breached", async () => {
    const index = service.computeConcentrationIndex("zone-3", { provA: 0.9, provB: 0.1 });
    expect(index.explorationAdded).toBe(true);
    await service.triggerExploration("zone-3", index);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it("simulates allocation with exploration bonus", () => {
    const adjusted = service.simulateWithExploration(
      { provA: 0.8, provB: 0.2 },
      0.1,
    );
    // provB should get the exploration bonus
    expect(adjusted.provB).toBeGreaterThan(0.2);
  });
});

describe("CalibrationFeedbackService (§33.2)", () => {
  let service: CalibrationFeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CalibrationFeedbackService(mockEventBus as never);
  });

  it("emits calibration feedback metrics", async () => {
    const snapshot = await service.emitCalibrationFeedback({
      stratifiedMetrics: {
        demand_forecast: { expected: 0.8, observed: 0.78 },
        fulfillment_rate: { expected: 0.9, observed: 0.92 },
      },
      recommitSLAHitRate: 0.95,
      gLevelDowngradeRate: 0.05,
      escrowUtilization: 0.6,
      avgDisputeResolutionMs: 120000,
      commitmentFulfillmentRate: 0.93,
    });
    expect(snapshot.recommitSLAHitRate).toBe(0.95);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it("computes calibration error correctly", () => {
    const { absoluteError, relativeError } = service.computeCalibrationError(0.8, 0.78);
    expect(absoluteError).toBeCloseTo(0.02);
    expect(relativeError).toBeCloseTo(0.025);
  });

  it("assesses overall calibration", () => {
    const assessment = service.assessCalibration({
      bucket1: { expected: 0.8, observed: 0.79 },
      bucket2: { expected: 0.9, observed: 0.88 },
    });
    expect(assessment.isWellCalibrated).toBe(true); // avg error < 0.05
  });
});

describe("UserEquilibriumGuardService (§21.5)", () => {
  let service: UserEquilibriumGuardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserEquilibriumGuardService(mockEventBus as never);
  });

  it("does not trigger when UE ≈ SO", () => {
    const result = service.evaluate(
      { linkA: 100, linkB: 200 },
      { linkA: 102, linkB: 198 },
      0.2,
    );
    expect(result.triggered).toBe(false);
  });

  it("triggers when UE deviates significantly from SO", () => {
    const result = service.evaluate(
      { linkA: 100, linkB: 100 },
      { linkA: 200, linkB: 50 },
      0.2,
    );
    expect(result.triggered).toBe(true);
    expect(result.maxDeviation).toBeGreaterThan(0.2);
  });

  it("computes MNL probabilities that sum to 1", () => {
    const probs = service.computeMNLProbabilities({
      routeA: 2,
      routeB: 1,
      routeC: 0.5,
    });
    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("computes UE flow proportional to MNL probabilities", () => {
    const flow = service.computeUEFlow({ routeA: 2, routeB: 1 }, 1000);
    const total = Object.values(flow).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1000);
    expect(flow.routeA).toBeGreaterThan(flow.routeB);
  });
});
