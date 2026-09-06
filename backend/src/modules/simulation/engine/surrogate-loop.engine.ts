// §17.5/§44 — Surrogate-modulated simulation loop
import type {
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
} from "../types/scenario.types";
import type {
  MonteCarloConfig,
  SurrogateConfig,
  SurrogateBiasContext,
  SurrogateBiasCorrection,
} from "../types/simulation-config.types";
import { DEFAULT_SURROGATE_CONFIG } from "../types/simulation-config.types";
import type {
  MonteCarloOutput,
  SurrogateLoopResult,
} from "../types/simulation-result.types";
import { createUncertainValue } from "@core/common/uncertain-value";
import { runMonteCarlo } from "./monte-carlo.engine";

// §17.5 — Surrogate model interface: fast approximation of simulation
export interface SurrogateModel {
  /**
   * Predict zone load using surrogate (fast, approximate).
   * @param zoneId - zone identifier
   * @param windowIndex - time window index
   * @param allocatedAttendees - allocated count
   * @param complianceRate - compliance assumption
   */
  predict(
    zoneId: string,
    windowIndex: number,
    allocatedAttendees: number,
    complianceRate: number,
  ): number;
}

// §17.5 — Default linear surrogate model
export class LinearSurrogateModel implements SurrogateModel {
  private readonly slope: number;
  private readonly intercept: number;

  constructor(slope = 0.95, intercept = 2) {
    this.slope = slope;
    this.intercept = intercept;
  }

  predict(
    _zoneId: string,
    _windowIndex: number,
    allocatedAttendees: number,
    complianceRate: number,
  ): number {
    return this.slope * allocatedAttendees * complianceRate + this.intercept;
  }
}

// §17.5/§44 — Bias correction: b(z, size, plan_type, weather) = E[sim - surrogate | context]
export function computeSurrogateBiasCorrection(
  simResults: number[],
  surrogateResults: number[],
  context: SurrogateBiasContext,
): SurrogateBiasCorrection {
  const n = Math.min(simResults.length, surrogateResults.length);
  if (n === 0) {
    return {
      context,
      biasEstimate: 0,
      biasStdError: 0,
      sampleCount: 0,
      validityGatePassed: false,
    };
  }

  // Compute bias = E[sim - surrogate]
  const diffs = [];
  for (let i = 0; i < n; i++) {
    diffs.push(simResults[i] - surrogateResults[i]);
  }
  const biasEstimate = diffs.reduce((a, b) => a + b, 0) / n;

  // Standard error of bias estimate
  let stdError = 0;
  if (n > 1) {
    const variance =
      diffs.reduce((sum, d) => sum + (d - biasEstimate) ** 2, 0) / (n - 1);
    stdError = Math.sqrt(variance / n);
  }

  // §17.5 — Validity gate: bias must be within acceptable range relative to surrogate predictions
  const meanSurrogate =
    surrogateResults.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const relativeBias =
    meanSurrogate > 0 ? Math.abs(biasEstimate) / meanSurrogate : 0;
  const validityGatePassed = relativeBias <= DEFAULT_SURROGATE_CONFIG.validityGateMaxDivergence;

  return {
    context,
    biasEstimate,
    biasStdError: stdError,
    sampleCount: n,
    validityGatePassed,
  };
}

// §17.5 — Run surrogate-modulated loop with iteration counts [1, 2, 3, 5]
export function runSurrogateLoop(
  plan: SimulationPlan,
  zones: SimulationZone[],
  scenario: ScenarioSeed,
  config: MonteCarloConfig,
  surrogateConfig: SurrogateConfig = DEFAULT_SURROGATE_CONFIG,
  surrogate?: SurrogateModel,
): SurrogateLoopResult {
  const model = surrogate ?? new LinearSurrogateModel();
  const perIteration: SurrogateLoopResult["perIteration"] = [];
  const validityGateStatus: Record<number, boolean> = {};

  for (const iterCount of surrogateConfig.iterationCounts) {
    // Create a reduced MC config for this iteration count
    const reducedConfig: MonteCarloConfig = {
      ...config,
      n: iterCount,
    };

    // Run full simulation for this iteration count
    const mcResult = runMonteCarlo(plan, zones, scenario, reducedConfig);

    // Run surrogate predictions for comparison
    const simResults: number[] = [];
    const surrogateResults: number[] = [];
    const windowCount = Math.ceil(plan.planningHorizonMinutes / 30);

    for (let w = 0; w < windowCount; w++) {
      for (const zone of zones) {
        const allocated = plan.allocations
          .filter((a) => a.zoneId === zone.id)
          .reduce((sum, a) => sum + a.allocatedCount, 0);

        const simLoad =
          mcResult.iterationTraces.length > 0
            ? mcResult.iterationTraces[0].snapshots.find(
                (s) => s.zoneId === zone.id && s.timeWindowIndex === w,
              )?.load ?? 0
            : 0;

        const surrogateLoad = model.predict(
          zone.id,
          w,
          allocated,
          0.85, // base compliance
        );

        simResults.push(simLoad);
        surrogateResults.push(surrogateLoad);
      }
    }

    // §17.5/§44 — Compute bias correction b(z, size, plan_type, weather)
    const biasCorrection = surrogateConfig.biasCorrectionEnabled
      ? computeSurrogateBiasCorrection(simResults, surrogateResults, {
          zoneId: zones.map((z) => z.id).join(","),
          zoneSize: zones.reduce(
            (sum, z) => sum + z.geometry.areaM2,
            0,
          ),
          planType: plan.allocations.length > 0 ? "multi-zone" : "empty",
          weatherCondition: scenario.weather.condition,
        })
      : {
          context: {
            zoneId: "",
            zoneSize: 0,
            planType: "unknown",
            weatherCondition: scenario.weather.condition,
          },
          biasEstimate: 0,
          biasStdError: 0,
          sampleCount: 0,
          validityGatePassed: true,
        };

    validityGateStatus[iterCount] = biasCorrection.validityGatePassed;

    perIteration.push({
      iterationCount: iterCount,
      result: mcResult,
      biasCorrection,
    });
  }

  // Select final result: highest iteration count with valid bias correction
  let finalResult = perIteration[0].result;
  for (const pi of perIteration) {
    if (pi.biasCorrection.validityGatePassed) {
      finalResult = pi.result;
    }
  }

  return {
    perIteration,
    validityGateStatus,
    finalResult,
  };
}
