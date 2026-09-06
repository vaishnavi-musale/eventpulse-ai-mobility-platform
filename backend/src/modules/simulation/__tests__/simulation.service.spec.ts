// §17 — L5 Simulation unit tests
import { createSeededRng, runMonteCarlo } from "../engine/monte-carlo.engine";
import { runShadowCity } from "../engine/shadow-city.engine";
import { runRedTeamStressTest, DEFAULT_RED_TEAM_CONFIG } from "../engine/red-team.engine";
import { runSurrogateLoop, computeSurrogateBiasCorrection } from "../engine/surrogate-loop.engine";
import { DEFAULT_MONTE_CARLO_CONFIG } from "../types/simulation-config.types";
import { DEFAULT_HONESTY_POLICY } from "../types/scenario.types";
import { resolveWeatherSeed, DefaultWeatherFeed } from "../weather/weather-scenario.seed";
import type {
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
} from "../types/scenario.types";
import type { ZoneTimeSnapshot } from "../types/simulation-result.types";
import type { MonteCarloConfig } from "../types/simulation-config.types";

// --- Test fixtures ---
function makeZone(overrides: Partial<SimulationZone> = {}): SimulationZone {
  return {
    id: "zone-1",
    label: "Test Metro Platform",
    geometry: {
      areaM2: 1000,
      perimeterM: 200,
      egressWidthM: 4,
      egressCount: 2,
      type: "metro_platform",
    },
    capacityUnits: [
      {
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
      },
    ],
    densityLimit: 4,
    egressTargetP95: 15,
    holdComfort: 200,
    holdTimeLimit: 30,
    floorCapacity: 50,
    emergencyAccessRequired: true,
    ...overrides,
  };
}

function makePlan(overrides: Partial<SimulationPlan> = {}): SimulationPlan {
  return {
    id: "plan-1",
    label: "Test Plan",
    allocations: [
      {
        zoneId: "zone-1",
        allocatedCount: 300,
        gLevel: "G3",
        resourceType: "metro_platform",
        capacityUnitRef: "cu-1",
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 30 * 60000),
      },
    ],
    totalAttendees: 300,
    planningHorizonMinutes: 120,
    ...overrides,
  };
}

function makeScenario(overrides: Partial<ScenarioSeed> = {}): ScenarioSeed {
  return {
    id: "scenario-1",
    label: "Test Scenario",
    weather: {
      condition: "clear",
      temperature: 22,
      windSpeed: 5,
      precipProbability: 0,
      isLive: false,
      timestamp: new Date(),
    },
    rngSeed: 12345,
    scenarioTime: new Date(),
    ...overrides,
  };
}

describe("§17 Simulation Engine", () => {
  describe("§17.1 — Seeded PRNG", () => {
    it("produces deterministic sequence from same seed", () => {
      const rng1 = createSeededRng(42);
      const rng2 = createSeededRng(42);
      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());
      expect(seq1).toEqual(seq2);
    });

    it("produces different sequences from different seeds", () => {
      const rng1 = createSeededRng(42);
      const rng2 = createSeededRng(99);
      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());
      expect(seq1).not.toEqual(seq2);
    });

    it("values are in [0, 1)", () => {
      const rng = createSeededRng(42);
      for (let i = 0; i < 100; i++) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe("§17.1 — Monte Carlo honesty", () => {
    it("marks n=10 as visualization-only", () => {
      const config: MonteCarloConfig = {
        ...DEFAULT_MONTE_CARLO_CONFIG,
        n: 10,
        antitheticVariates: false,
      };
      const result = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario(),
        config,
      );
      expect(result.isVisualizationOnly).toBe(true);
      expect(result.evidence.isVisualizationOnly).toBe(true);
      expect(result.evidence.annotation).toContain("visualization only");
    });

    it("does NOT mark n=100 as visualization-only", () => {
      const config: MonteCarloConfig = {
        ...DEFAULT_MONTE_CARLO_CONFIG,
        n: 100,
        antitheticVariates: false,
      };
      const result = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario(),
        config,
      );
      expect(result.isVisualizationOnly).toBe(false);
    });

    it("tail claims permitted at n>=100", () => {
      const config: MonteCarloConfig = {
        ...DEFAULT_MONTE_CARLO_CONFIG,
        n: 100,
        antitheticVariates: false,
      };
      const result = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario(),
        config,
      );
      expect(result.evidence.annotation).toContain("tail probability claims permitted");
    });

    it("output carries evidenceTier S", () => {
      const result = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario(),
        DEFAULT_MONTE_CARLO_CONFIG,
      );
      expect(result.evidence.tier).toBe("S");
    });

    it("CI is stated in output", () => {
      const result = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario(),
        DEFAULT_MONTE_CARLO_CONFIG,
      );
      expect(result.aggregatedStats.violationRate.ciLower).toBeDefined();
      expect(result.aggregatedStats.violationRate.ciUpper).toBeDefined();
      expect(result.aggregatedStats.violationRate.confidenceLevel).toBe(0.9);
    });
  });

  describe("§17.4 — Shadow City counterfactual", () => {
    it("delta is labeled simulated_counterfactual_impact", () => {
      const { shadowDelta } = runShadowCity(
        makePlan(),
        [makeZone()],
        makeScenario(),
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 20, antitheticVariates: false },
      );
      expect(shadowDelta.evidenceLabel).toBe("simulated_counterfactual_impact");
    });

    it("annotation explicitly disclaims causality", () => {
      const { shadowDelta } = runShadowCity(
        makePlan(),
        [makeZone()],
        makeScenario(),
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 20, antitheticVariates: false },
      );
      expect(shadowDelta.annotation).toContain("NOT a causal claim");
    });

    it("uses same seed for both runs", () => {
      const scenario = makeScenario();
      const { shadowDelta } = runShadowCity(
        makePlan(),
        [makeZone()],
        scenario,
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 20, antitheticVariates: false },
      );
      expect(shadowDelta.sharedSeed).toBe(scenario.rngSeed);
    });
  });

  describe("§17.2 — Red-team stress", () => {
    it("generates advisories for high violation rates", () => {
      const results = runRedTeamStressTest(
        makePlan(),
        [makeZone()],
        makeScenario(),
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 20, antitheticVariates: false },
        {
          ...DEFAULT_RED_TEAM_CONFIG,
          hardSlipPct: 80,
          complianceLowPct: 2,
        },
      );
      expect(results.length).toBeGreaterThan(0);
      // At least one result should have evidence
      for (const r of results) {
        expect(r.evidence.tier).toBe("S");
        expect(r.complianceDistribution.p5).toBe(2);
      }
    });

    it("default config has 5%/95% compliance and 50% HARD-slip", () => {
      expect(DEFAULT_RED_TEAM_CONFIG.complianceLowPct).toBe(5);
      expect(DEFAULT_RED_TEAM_CONFIG.complianceHighPct).toBe(95);
      expect(DEFAULT_RED_TEAM_CONFIG.hardSlipPct).toBe(50);
    });
  });

  describe("§17.5 — Surrogate bias correction", () => {
    it("computes bias = E[sim - surrogate]", () => {
      const simResults = [10, 12, 11, 13, 9];
      const surrogateResults = [9, 11, 10, 12, 8];
      const correction = computeSurrogateBiasCorrection(
        simResults,
        surrogateResults,
        {
          zoneId: "zone-1",
          zoneSize: 1000,
          planType: "multi-zone",
          weatherCondition: "clear",
        },
      );
      // Bias should be ~1.0 (sim consistently 1 higher than surrogate)
      expect(correction.biasEstimate).toBeCloseTo(1.0, 1);
      expect(correction.sampleCount).toBe(5);
      expect(correction.validityGatePassed).toBe(true);
    });

    it("validity gate fails for large bias", () => {
      const simResults = [100, 100, 100];
      const surrogateResults = [10, 10, 10];
      const correction = computeSurrogateBiasCorrection(
        simResults,
        surrogateResults,
        {
          zoneId: "zone-1",
          zoneSize: 1000,
          planType: "multi-zone",
          weatherCondition: "clear",
        },
      );
      expect(correction.validityGatePassed).toBe(false);
    });
  });

  describe("§15.4 — Weather scenario seed", () => {
    it("sudden_rain with live feed uses live weather", async () => {
      const liveFeed: DefaultWeatherFeed = {
        getCurrentWeather: async () => ({
          condition: "sudden_rain",
          temperature: 18,
          windSpeed: 20,
          precipProbability: 0.9,
          isLive: true,
          timestamp: new Date(),
        }),
      };
      const seed = await resolveWeatherSeed("sudden_rain", liveFeed);
      expect(seed.isLive).toBe(true);
      expect(seed.condition).toBe("sudden_rain");
      expect(seed.temperature).toBe(18);
    });

    it("non-sudden_rain uses static defaults", async () => {
      const seed = await resolveWeatherSeed("clear");
      expect(seed.isLive).toBe(false);
      expect(seed.condition).toBe("clear");
    });

    it("sudden_rain without feed falls back to static", async () => {
      const seed = await resolveWeatherSeed("sudden_rain");
      expect(seed.isLive).toBe(false);
      expect(seed.condition).toBe("sudden_rain");
    });
  });

  describe("§17 — Change constraint definition", () => {
    it("different seeds produce different simulation traces", () => {
      const result1 = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario({ rngSeed: 42 }),
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 1, antitheticVariates: false },
      );
      const result2 = runMonteCarlo(
        makePlan(),
        [makeZone()],
        makeScenario({ rngSeed: 99 }),
        { ...DEFAULT_MONTE_CARLO_CONFIG, n: 1, antitheticVariates: false },
      );
      // Different seeds → different traces (probabilistic but very likely)
      expect(result1.iterationTraces[0].stats.meanLoad).not.toBe(
        result2.iterationTraces[0].stats.meanLoad,
      );
    });

    it("same seed produces same traces", () => {
      const scenario = makeScenario({ rngSeed: 42 });
      const config = { ...DEFAULT_MONTE_CARLO_CONFIG, n: 1, antitheticVariates: false };
      const r1 = runMonteCarlo(makePlan(), [makeZone()], scenario, config);
      const r2 = runMonteCarlo(makePlan(), [makeZone()], scenario, config);
      expect(r1.iterationTraces[0].stats.meanLoad).toBe(
        r2.iterationTraces[0].stats.meanLoad,
      );
    });
  });
});
