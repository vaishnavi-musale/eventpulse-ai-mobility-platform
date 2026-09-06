// §17.2/§18.6 — Red-team stress scenario generator
import type {
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
  RedTeamConfig,
  AdversarialScenario,
} from "../types/scenario.types";
import type { MonteCarloConfig } from "../types/simulation-config.types";
import type {
  MonteCarloOutput,
  RedTeamResult,
} from "../types/simulation-result.types";
import type { UncertainValue } from "@core/common/uncertain-value";
import { createUncertainValue } from "@core/common/uncertain-value";
import { runMonteCarlo, createSeededRng } from "./monte-carlo.engine";

// §17.2 — Default red-team config (replaceable with historical quantiles)
export const DEFAULT_RED_TEAM_CONFIG: RedTeamConfig = {
  complianceLowPct: 5,
  complianceHighPct: 95,
  hardSlipPct: 50,
  adversarialScenarios: [
    {
      type: "capacity_understatement",
      affectedResources: ["metro_platform", "shuttle_bus"],
      severity: 0.2,
      durationMinutes: 30,
      label: "Metro capacity understated by 20%",
    },
    {
      type: "inventory_gaming",
      affectedResources: ["hotel", "restaurant"],
      severity: 0.15,
      durationMinutes: 60,
      label: "Hotel/restaurant inventory gaming",
    },
    {
      type: "hoarding",
      affectedResources: ["metro_platform", "shuttle_bus"],
      severity: 0.3,
      durationMinutes: 45,
      label: "Metro/shuttle hoarding",
    },
  ],
};

// §17.2 — Apply adversarial scenario to zones
function applyAdversarialScenario(
  zones: SimulationZone[],
  scenario: AdversarialScenario,
): SimulationZone[] {
  return zones.map((zone) => {
    const affected = zone.capacityUnits.some(
      (cu) =>
        scenario.affectedResources.includes(cu.type) &&
        cu.status !== "unavailable",
    );
    if (!affected) return zone;

    // Reduce effective capacity by severity factor
    const reducedUnits = zone.capacityUnits.map((cu) => ({
      ...cu,
      usableCapacity: Math.round(
        cu.usableCapacity * (1 - scenario.severity),
      ),
    }));

    return { ...zone, capacityUnits: reducedUnits };
  });
}

// §17.2 — Run a single red-team stress test
export function runRedTeamStressTest(
  plan: SimulationPlan,
  zones: SimulationZone[],
  scenario: ScenarioSeed,
  config: MonteCarloConfig,
  redTeamConfig: RedTeamConfig,
): RedTeamResult[] {
  const results: RedTeamResult[] = [];

  // Run stress test for each adversarial scenario
  for (const adversarial of redTeamConfig.adversarialScenarios) {
    const stressedZones = applyAdversarialScenario(zones, adversarial);

    const stressScenario: ScenarioSeed = {
      ...scenario,
      id: `${scenario.id}-redteam-${adversarial.type}`,
      label: `${scenario.label} (${adversarial.label})`,
      rngSeed: scenario.rngSeed + adversarial.type.length * 1000,
    };

    const mcResult = runMonteCarlo(
      plan,
      stressedZones,
      stressScenario,
      config,
      redTeamConfig,
    );

    // Compute violation rate under stress
    const violationRates = mcResult.iterationTraces.map(
      (t) => t.stats.totalViolations / Math.max(t.snapshots.length, 1),
    );
    const meanViolation =
      violationRates.reduce((a, b) => a + b, 0) /
      Math.max(violationRates.length, 1);
    const se =
      violationRates.length > 1
        ? Math.sqrt(
            violationRates.reduce(
              (sum, v) => sum + (v - meanViolation) ** 2,
              0,
            ) /
              ((violationRates.length - 1) * violationRates.length),
          )
        : 0;

    const violationUncertain = createUncertainValue(
      meanViolation,
      meanViolation - 1.96 * se,
      meanViolation + 1.96 * se,
      0.95,
      mcResult.isVisualizationOnly ? "uncalibrated" : "calibrated",
    );

    // Generate advisories
    const advisories: string[] = [];
    if (meanViolation > 0.1) {
      advisories.push(
        `CRITICAL: ${adversarial.label} produces ${(meanViolation * 100).toFixed(1)}% violation rate — consider contingency`,
      );
    }
    if (meanViolation > 0.05) {
      advisories.push(
        `WARNING: ${adversarial.label} elevated violations — monitor closely`,
      );
    }
    if (adversarial.severity > 0.25) {
      advisories.push(
        `HIGH SEVERITY: ${adversarial.type} at ${(adversarial.severity * 100).toFixed(0)}% — stress test boundary`,
      );
    }

    results.push({
      scenarioLabel: adversarial.label,
      complianceDistribution: {
        p5: redTeamConfig.complianceLowPct,
        p95: redTeamConfig.complianceHighPct,
      },
      hardSlipRate: redTeamConfig.hardSlipPct / 100,
      violationRate: violationUncertain,
      evidence: mcResult.evidence,
      advisories,
    });
  }

  // §17.2 — Run baseline red-team (compliance distribution stress only)
  const baselineScenario: ScenarioSeed = {
    ...scenario,
    id: `${scenario.id}-redteam-baseline`,
    label: `${scenario.label} (Red-team: compliance stress)`,
    rngSeed: scenario.rngSeed + 99999,
  };

  const baselineResult = runMonteCarlo(
    plan,
    zones,
    baselineScenario,
    config,
    redTeamConfig,
  );

  const baselineViolationRates = baselineResult.iterationTraces.map(
    (t) => t.stats.totalViolations / Math.max(t.snapshots.length, 1),
  );
  const baselineMean =
    baselineViolationRates.reduce((a, b) => a + b, 0) /
    Math.max(baselineViolationRates.length, 1);
  const baselineSe =
    baselineViolationRates.length > 1
      ? Math.sqrt(
          baselineViolationRates.reduce(
            (sum, v) => sum + (v - baselineMean) ** 2,
            0,
          ) /
            ((baselineViolationRates.length - 1) * baselineViolationRates.length),
        )
      : 0;

  results.push({
    scenarioLabel: "Baseline compliance stress (5%/95%/HARD-slip 50%)",
    complianceDistribution: {
      p5: redTeamConfig.complianceLowPct,
      p95: redTeamConfig.complianceHighPct,
    },
    hardSlipRate: redTeamConfig.hardSlipPct / 100,
    violationRate: createUncertainValue(
      baselineMean,
      baselineMean - 1.96 * baselineSe,
      baselineMean + 1.96 * baselineSe,
      0.95,
    ),
    evidence: baselineResult.evidence,
    advisories:
      baselineMean > 0.05
        ? [
            `BASELINE: Compliance stress produces ${(baselineMean * 100).toFixed(1)}% violations — review plan robustness`,
          ]
        : [],
  });

  return results;
}
