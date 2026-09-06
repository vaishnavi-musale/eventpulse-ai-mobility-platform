// §17.4 — Shadow City: parallel no-commitment counterfactual, same seed
import type { SimulationPlan, SimulationZone, ScenarioSeed } from "../types/scenario.types";
import type { MonteCarloConfig } from "../types/simulation-config.types";
import type { MonteCarloOutput, ShadowCityDelta } from "../types/simulation-result.types";
import type { UncertainValue } from "@core/common/uncertain-value";
import { createUncertainValue } from "@core/common/uncertain-value";
import { runMonteCarlo } from "./monte-carlo.engine";

// §17.4 — Build a "no-commitment" plan: zero allocations
function buildNoCommitmentPlan(original: SimulationPlan): SimulationPlan {
  return {
    id: `${original.id}-shadow`,
    label: `${original.label} (Shadow City: no-commitment counterfactual)`,
    allocations: [], // no commitments
    totalAttendees: original.totalAttendees,
    planningHorizonMinutes: original.planningHorizonMinutes,
  };
}

// Compute CI for delta values
function computeDeltaCi(
  valuesA: number[],
  valuesB: number[],
  ciLevel: number,
): UncertainValue {
  const n = Math.min(valuesA.length, valuesB.length);
  if (n === 0)
    return createUncertainValue(0, 0, 0, ciLevel, "uncalibrated");
  const deltas = [];
  for (let i = 0; i < n; i++) {
    deltas.push(valuesA[i] - valuesB[i]);
  }
  const mean = deltas.reduce((a, b) => a + b, 0) / n;
  if (n === 1) return createUncertainValue(mean, mean, mean, ciLevel);
  const variance =
    deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (n - 1);
  const se = Math.sqrt(variance / n);
  const z = ciLevel >= 0.99 ? 2.576 : ciLevel >= 0.95 ? 1.96 : 1.645;
  return createUncertainValue(
    mean,
    mean - z * se,
    mean + z * se,
    ciLevel,
    "calibrated",
  );
}

/**
 * §17.4 — Run Shadow City counterfactual.
 * Same seed, same zones, no commitments. Delta is explicitly labeled
 * "simulated counterfactual impact" (tier S) — never "causal."
 */
export function runShadowCity(
  plan: SimulationPlan,
  zones: SimulationZone[],
  scenario: ScenarioSeed,
  config: MonteCarloConfig,
): { withPlan: MonteCarloOutput; shadowDelta: ShadowCityDelta } {
  // Run with-plan simulation
  const withPlan = runMonteCarlo(plan, zones, scenario, config);

  // Build no-commitment plan
  const noCommitPlan = buildNoCommitmentPlan(plan);

  // §17.4 — SAME seed for parallel run (critical for valid counterfactual)
  const sameSeedScenario: ScenarioSeed = {
    ...scenario,
    id: `${scenario.id}-shadow`,
    label: `${scenario.label} (Shadow City)`,
  };

  // Run without-plan simulation
  const withoutPlan = runMonteCarlo(
    noCommitPlan,
    zones,
    sameSeedScenario,
    config,
  );

  // Compute per-zone load deltas
  const loadDeltaByZone: Record<
    string,
    { value: number; ci: UncertainValue }
  > = {};

  for (const zone of zones) {
    const withLoads = withPlan.iterationTraces.map((t) => {
      const zoneSnaps = t.snapshots.filter((s) => s.zoneId === zone.id);
      return zoneSnaps.reduce((sum, s) => sum + s.load, 0) / Math.max(zoneSnaps.length, 1);
    });
    const withoutLoads = withoutPlan.iterationTraces.map((t) => {
      const zoneSnaps = t.snapshots.filter((s) => s.zoneId === zone.id);
      return zoneSnaps.reduce((sum, s) => sum + s.load, 0) / Math.max(zoneSnaps.length, 1);
    });

    loadDeltaByZone[zone.id] = {
      ci: computeDeltaCi(withLoads, withoutLoads, config.ciLevel),
      value:
        withPlan.aggregatedStats.meanLoad.value -
        withoutPlan.aggregatedStats.meanLoad.value,
    };
  }

  // Build shadow city delta
  const shadowDelta: ShadowCityDelta = {
    evidenceLabel: "simulated_counterfactual_impact",
    evidence: {
      tier: "S",
      isVisualizationOnly: withPlan.isVisualizationOnly,
      ci: createUncertainValue(
        withPlan.aggregatedStats.violationRate.value -
          withoutPlan.aggregatedStats.violationRate.value,
        withPlan.aggregatedStats.violationRate.ciLower -
          withoutPlan.aggregatedStats.violationRate.ciUpper,
        withPlan.aggregatedStats.violationRate.ciUpper -
          withoutPlan.aggregatedStats.violationRate.ciLower,
        config.ciLevel,
      ),
      iterationCount: withPlan.iterationsRun,
      importanceSamplingUsed: false,
      annotation:
        "Simulated counterfactual impact (tier S) — NOT causal. Same-seed parallel run with no-commitment baseline.",
    },
    loadDeltaByZone,
    violationRateDelta: computeDeltaCi(
      withPlan.iterationTraces.map(
        (t) => t.stats.totalViolations / Math.max(t.snapshots.length, 1),
      ),
      withoutPlan.iterationTraces.map(
        (t) => t.stats.totalViolations / Math.max(t.snapshots.length, 1),
      ),
      config.ciLevel,
    ),
    complianceDelta: computeDeltaCi(
      withPlan.iterationTraces.map((t) => t.stats.meanComplianceRate),
      withoutPlan.iterationTraces.map((t) => t.stats.meanComplianceRate),
      config.ciLevel,
    ),
    egressDelta: computeDeltaCi(
      withPlan.iterationTraces.map((t) => t.stats.egressP99),
      withoutPlan.iterationTraces.map((t) => t.stats.egressP99),
      config.ciLevel,
    ),
    sharedSeed: scenario.rngSeed,
    annotation:
      "Shadow City counterfactual: simulated impact only. This is NOT a causal claim. Tier S evidence with stated CI.",
  };

  return { withPlan, shadowDelta };
}
