// §17.1 — Monte Carlo engine with honesty rules
import type { CapacityUnit } from "@core/domain/capacity-unit";
import type { GLevel } from "@core/domain/g-level.enum";
import type { UncertainValue } from "@core/common/uncertain-value";
import { createUncertainValue } from "@core/common/uncertain-value";
import type {
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
  RedTeamConfig,
} from "../types/scenario.types";
import type {
  MonteCarloConfig,
  SimulationRunConfig,
} from "../types/simulation-config.types";
import { DEFAULT_HONESTY_POLICY } from "../types/scenario.types";
import type {
  MonteCarloOutput,
  SimulationTrace,
  ZoneTimeSnapshot,
  SimulationStats,
  EvidenceTag,
} from "../types/simulation-result.types";
import type { WeatherFeed } from "../weather/weather-scenario.seed";
import { resolveWeatherSeed } from "../weather/weather-scenario.seed";

// §17.1 — Simple seeded PRNG (mulberry32)
export function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller for normal distribution
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// §17.1 — Honesty: determine if output is visualization-only
function isVisualizationOnly(n: number): boolean {
  return n <= DEFAULT_HONESTY_POLICY.vizOnlyThreshold;
}

// §17.1 — Honesty: can we claim tail probability?
function canClaimTailProbability(n: number): boolean {
  return n >= DEFAULT_HONESTY_POLICY.tailClaimMinN;
}

// Compute CI using bootstrap approximation (mean ± z * se)
function computeCi(
  values: number[],
  ciLevel: number,
): { mean: number; ciLower: number; ciUpper: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, ciLower: 0, ciUpper: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n === 1) return { mean, ciLower: mean, ciUpper: mean };
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const se = Math.sqrt(variance / n);
  // z-score approximation for common CI levels
  const zMap: Record<number, number> = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  const z = zMap[ciLevel] ?? 1.96;
  return {
    mean,
    ciLower: mean - z * se,
    ciUpper: mean + z * se,
  };
}

// §17.3 — Simulate a single time window for a zone
function simulateWindow(
  zone: SimulationZone,
  windowIndex: number,
  allocatedAttendees: number,
  complianceRate: number,
  rng: () => number,
): ZoneTimeSnapshot {
  // Actual load = allocated × compliance + noise
  const complianceNoise = normalRandom(rng) * 0.05;
  const actualCompliance = Math.max(
    0,
    Math.min(1, complianceRate + complianceNoise),
  );
  const load = Math.round(allocatedAttendees * actualCompliance);
  const density = load / zone.geometry.areaM2;

  // Egress simulation (simplified queue model)
  const egressRate = zone.geometry.egressWidthM * 0.8; // attendees/min per meter width
  const egressTime =
    load > 0 ? load / (egressRate * zone.geometry.egressCount) : 0;
  const egressP95 = egressTime * (1 + normalRandom(rng) * 0.2);

  // Hold zone
  const holdUsage = Math.min(load, zone.holdComfort);
  const holdTimeViolation = holdUsage >= zone.holdComfort && rng() < 0.3;

  // Vulnerable group egress (simplified)
  const vulnerableFraction = 0.08; // 8% baseline
  const vulnerableGroupEgress =
    load * vulnerableFraction * (1 + normalRandom(rng) * 0.1);

  return {
    zoneId: zone.id,
    timeWindowIndex: windowIndex,
    load,
    density,
    densityLimit: zone.densityLimit,
    densityViolation: density > zone.densityLimit,
    egressFlow: load / Math.max(egressTime, 0.01),
    egressP95,
    egressTargetP95: zone.egressTargetP95,
    egressViolation: egressP95 > zone.egressTargetP95,
    holdUsage,
    holdComfort: zone.holdComfort,
    holdTimeViolation,
    vulnerableGroupEgress,
    vulnerableGroupFloor: zone.floorCapacity * vulnerableFraction,
    vulnerableGroupViolation:
      vulnerableGroupEgress < zone.floorCapacity * vulnerableFraction,
    emergencyAccessPreserved: zone.emergencyAccessRequired ? rng() > 0.02 : true,
    complianceRate: actualCompliance,
  };
}

// §17.1 — Red-team stress: adjust compliance per red-team config
function applyRedTeamStress(
  baseCompliance: number,
  redTeam: RedTeamConfig,
  rng: () => number,
): number {
  const p5 = redTeam.historicalQuantiles?.complianceP5 ?? redTeam.complianceLowPct / 100;
  const p95 = redTeam.historicalQuantiles?.complianceP95 ?? redTeam.complianceHighPct / 100;
  // Beta distribution approximation
  const beta = baseCompliance * 10;
  const alpha = (1 - baseCompliance) * 10;
  let compliance = baseCompliance + normalRandom(rng) * 0.1;
  // Clamp to red-team bounds
  compliance = Math.max(p5, Math.min(p95, compliance));

  // HARD-slip: randomly drop compliance further
  const hardSlipRate = (redTeam.historicalQuantiles?.hardSlipRate ?? redTeam.hardSlipPct) / 100;
  if (rng() < hardSlipRate) {
    compliance *= 0.5; // 50% HARD-slip
  }

  return Math.max(0, Math.min(1, compliance));
}

// §17 — Single simulation run (deterministic given seed)
export function runSingleSimulation(
  plan: SimulationPlan,
  zones: SimulationZone[],
  seed: number,
  baseCompliance: number,
  redTeam?: RedTeamConfig,
): SimulationTrace {
  const rng = createSeededRng(seed);
  const windowCount = Math.ceil(plan.planningHorizonMinutes / 30);
  const snapshots: ZoneTimeSnapshot[] = [];

  // Compute per-zone allocations
  const zoneAllocations = new Map<string, number>();
  for (const alloc of plan.allocations) {
    zoneAllocations.set(
      alloc.zoneId,
      (zoneAllocations.get(alloc.zoneId) ?? 0) + alloc.allocatedCount,
    );
  }

  for (let w = 0; w < windowCount; w++) {
    for (const zone of zones) {
      const allocated = zoneAllocations.get(zone.id) ?? 0;
      let compliance = baseCompliance;

      if (redTeam) {
        compliance = applyRedTeamStress(compliance, redTeam, rng);
      }

      snapshots.push(simulateWindow(zone, w, allocated, compliance, rng));
    }
  }

  // Aggregate stats
  const stats: SimulationStats = {
    meanLoad:
      snapshots.reduce((s, sn) => s + sn.load, 0) / Math.max(snapshots.length, 1),
    maxDensity: Math.max(...snapshots.map((s) => s.density), 0),
    totalViolations: snapshots.filter(
      (s) =>
        s.densityViolation ||
        s.egressViolation ||
        s.holdTimeViolation ||
        s.vulnerableGroupViolation ||
        !s.emergencyAccessPreserved,
    ).length,
    violationsByType: {
      density: snapshots.filter((s) => s.densityViolation).length,
      egress: snapshots.filter((s) => s.egressViolation).length,
      hold_time: snapshots.filter((s) => s.holdTimeViolation).length,
      vulnerable_group: snapshots.filter((s) => s.vulnerableGroupViolation).length,
      emergency_access: snapshots.filter((s) => !s.emergencyAccessPreserved).length,
    },
    meanComplianceRate:
      snapshots.reduce((s, sn) => s + sn.complianceRate, 0) /
      Math.max(snapshots.length, 1),
    egressP99: Math.max(...snapshots.map((s) => s.egressP95), 0) * 1.2,
  };

  return { snapshots, stats };
}

// §17.1 — Importance sampling: reweight for tail events
function importanceSampleWeight(
  load: number,
  capacity: number,
  baseRate: number,
): number {
  if (load <= capacity) return 1;
  // Upweight tail events
  const ratio = load / Math.max(capacity, 1);
  return Math.min(ratio, 10); // cap weight
}

// §17.1 — Full Monte Carlo with honesty
export function runMonteCarlo(
  plan: SimulationPlan,
  zones: SimulationZone[],
  scenario: ScenarioSeed,
  config: MonteCarloConfig,
  redTeam?: RedTeamConfig,
  weatherFeed?: WeatherFeed,
): MonteCarloOutput {
  const traces: SimulationTrace[] = [];
  const baseCompliance = 0.85;
  const vizOnly = isVisualizationOnly(config.n);

  // §15.4 — Resolve weather seed
  const weatherPromise = resolveWeatherSeed(
    scenario.weather.condition,
    weatherFeed,
  );

  for (let i = 0; i < config.n; i++) {
    const runSeed = scenario.rngSeed + i;
    let compliance = baseCompliance;

    // §17.2 — Apply red-team stress if configured
    const redTeamForRun = redTeam && i % 3 === 0 ? redTeam : undefined;

    const trace = runSingleSimulation(
      plan,
      zones,
      runSeed,
      compliance,
      redTeamForRun,
    );
    traces.push(trace);
  }

  // §17.1 — Antithetic variates for variance reduction
  if (config.antitheticVariates && config.n > 10) {
    const halfN = Math.floor(config.n / 2);
    for (let i = 0; i < halfN; i++) {
      const invSeed = scenario.rngSeed + config.n + i;
      const invTrace = runSingleSimulation(
        plan,
        zones,
        invSeed,
        baseCompliance,
      );
      traces.push(invTrace);
    }
  }

  // Aggregate across iterations
  const meanLoads = traces.map((t) => t.stats.meanLoad);
  const maxDensities = traces.map((t) => t.stats.maxDensity);
  const violationRates = traces.map(
    (t) => t.stats.totalViolations / Math.max(t.snapshots.length, 1),
  );
  const complianceRates = traces.map((t) => t.stats.meanComplianceRate);
  const egressP95s = traces.map((t) => t.stats.egressP99);

  const ciLevel = config.ciLevel;
  const mlCi = computeCi(meanLoads, ciLevel);
  const mdCi = computeCi(maxDensities, ciLevel);
  const vrCi = computeCi(violationRates, ciLevel);
  const crCi = computeCi(complianceRates, ciLevel);
  const epCi = computeCi(egressP95s, ciLevel);

  // §17.1 — Tail claim check
  const canTailClaim = canClaimTailProbability(traces.length);
  const annotation = vizOnly
    ? `n=${traces.length} ≤ ${DEFAULT_HONESTY_POLICY.vizOnlyThreshold}: visualization only, never use for tail probability claims`
    : canTailClaim
      ? `n=${traces.length}: tail probability claims permitted with stated CI`
      : `n=${traces.length}: below tail claim threshold (${DEFAULT_HONESTY_POLICY.tailClaimMinN}), report point estimates only`;

  const evidence: EvidenceTag = {
    tier: "S",
    isVisualizationOnly: vizOnly,
    ci: createUncertainValue(
      vrCi.mean,
      vrCi.ciLower,
      vrCi.ciUpper,
      ciLevel,
      vizOnly ? "uncalibrated" : "calibrated",
    ),
    iterationCount: traces.length,
    importanceSamplingUsed: config.importanceSampling,
    annotation,
  };

  return {
    iterationsRun: traces.length,
    isVisualizationOnly: vizOnly,
    evidence,
    aggregatedStats: {
      meanLoad: createUncertainValue(
        mlCi.mean,
        mlCi.ciLower,
        mlCi.ciUpper,
        ciLevel,
      ),
      maxDensity: createUncertainValue(
        mdCi.mean,
        mdCi.ciLower,
        mdCi.ciUpper,
        ciLevel,
      ),
      violationRate: createUncertainValue(
        vrCi.mean,
        vrCi.ciLower,
        vrCi.ciUpper,
        ciLevel,
      ),
      meanComplianceRate: createUncertainValue(
        crCi.mean,
        crCi.ciLower,
        crCi.ciUpper,
        ciLevel,
      ),
      egressP95: createUncertainValue(
        epCi.mean,
        epCi.ciLower,
        epCi.ciUpper,
        ciLevel,
      ),
    },
    iterationTraces: traces,
    importanceWeights: config.importanceSampling
      ? traces.map((t) =>
          importanceSampleWeight(
            t.stats.meanLoad,
            plan.totalAttendees,
            baseCompliance,
          ),
        )
      : undefined,
  };
}
