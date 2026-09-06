// §17 — L5 Simulation service: orchestrator for Monte Carlo, Shadow City, Red-team, Surrogate loop
import { Injectable } from "@nestjs/common";
import { generateId } from "@core/common/ids";
import type {
  SimulationInput,
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
  RedTeamConfig,
} from "./types/scenario.types";
import {
  DEFAULT_HONESTY_POLICY,
} from "./types/scenario.types";
import type {
  MonteCarloConfig,
  SimulationRunConfig,
  SurrogateConfig,
} from "./types/simulation-config.types";
import {
  DEFAULT_SIMULATION_CONFIG,
  DEFAULT_MONTE_CARLO_CONFIG,
} from "./types/simulation-config.types";
import type {
  SimulationResult,
  MonteCarloOutput,
  ShadowCityDelta,
  RedTeamResult,
  SurrogateLoopResult,
} from "./types/simulation-result.types";
import { runMonteCarlo } from "./engine/monte-carlo.engine";
import { runShadowCity } from "./engine/shadow-city.engine";
import { runRedTeamStressTest, DEFAULT_RED_TEAM_CONFIG } from "./engine/red-team.engine";
import { runSurrogateLoop } from "./engine/surrogate-loop.engine";
import type { SurrogateModel } from "./engine/surrogate-loop.engine";

/**
 * §17 — L5 Simulation Service
 *
 * Orchestrates agent-based cohort simulation (arena: metro/venue/city zones),
 * Monte Carlo with honesty (§17.1), Shadow City counterfactual (§17.4),
 * Red-team stress (§17.2), and surrogate-modulated loop (§17.5/§44).
 *
 * All simulated outputs carry evidenceTier='S' with stated CI.
 */
@Injectable()
export class SimulationService {
  /**
   * §17 — Run complete simulation: Monte Carlo + optional Shadow City + Red-team + Surrogate loop
   */
  async runSimulation(
    input: SimulationInput,
    config: Partial<SimulationRunConfig> = {},
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    const fullConfig = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    const mcConfig = fullConfig.monteCarlo;

    // §17.1 — Validate honesty policy
    const honestyPolicy = input.honestyPolicy ?? DEFAULT_HONESTY_POLICY;

    // §17.1 — Monte Carlo with honesty
    const monteCarlo = runMonteCarlo(
      input.plan,
      input.zones,
      input.scenario,
      mcConfig,
      input.redTeam,
    );

    // §17.4 — Shadow City counterfactual (if enabled)
    let shadowCity: ShadowCityDelta | undefined;
    if (fullConfig.shadowCityEnabled) {
      const { shadowDelta } = runShadowCity(
        input.plan,
        input.zones,
        input.scenario,
        mcConfig,
      );
      shadowCity = shadowDelta;
    }

    // §17.2 — Red-team stress (if enabled)
    let redTeamResults: RedTeamResult[] = [];
    if (fullConfig.redTeamEnabled) {
      const redTeamConfig = input.redTeam ?? DEFAULT_RED_TEAM_CONFIG;
      redTeamResults = runRedTeamStressTest(
        input.plan,
        input.zones,
        input.scenario,
        mcConfig,
        redTeamConfig,
      );
    }

    // §17.5/§44 — Surrogate-modulated loop
    let surrogateLoop: SurrogateLoopResult | undefined;
    if (fullConfig.surrogate.biasCorrectionEnabled) {
      surrogateLoop = runSurrogateLoop(
        input.plan,
        input.zones,
        input.scenario,
        mcConfig,
        fullConfig.surrogate,
      );
    }

    // §30 — Determine overall evidence tier
    const overallTier = monteCarlo.isVisualizationOnly ? "S" : "S";

    return {
      id: generateId(),
      planId: input.plan.id,
      scenarioId: input.scenario.id,
      monteCarlo,
      shadowCity,
      redTeamResults,
      surrogateLoop,
      overallEvidenceTier: overallTier,
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * §17.1 — Quick Monte Carlo run (no Shadow City or red-team)
   */
  runMonteCarloOnly(
    plan: SimulationPlan,
    zones: SimulationZone[],
    scenario: ScenarioSeed,
    config: Partial<MonteCarloConfig> = {},
  ): MonteCarloOutput {
    const fullConfig = { ...DEFAULT_MONTE_CARLO_CONFIG, ...config };
    return runMonteCarlo(plan, zones, scenario, fullConfig);
  }

  /**
   * §17.4 — Shadow City counterfactual only
   */
  runShadowCityOnly(
    plan: SimulationPlan,
    zones: SimulationZone[],
    scenario: ScenarioSeed,
    config: Partial<MonteCarloConfig> = {},
  ): { withPlan: MonteCarloOutput; shadowDelta: ShadowCityDelta } {
    const fullConfig = { ...DEFAULT_MONTE_CARLO_CONFIG, ...config };
    return runShadowCity(plan, zones, scenario, fullConfig);
  }

  /**
   * §17.2 — Red-team stress test only
   */
  runRedTeamOnly(
    plan: SimulationPlan,
    zones: SimulationZone[],
    scenario: ScenarioSeed,
    redTeamConfig?: RedTeamConfig,
    config: Partial<MonteCarloConfig> = {},
  ): RedTeamResult[] {
    const fullConfig = { ...DEFAULT_MONTE_CARLO_CONFIG, ...config };
    return runRedTeamStressTest(
      plan,
      zones,
      scenario,
      fullConfig,
      redTeamConfig ?? DEFAULT_RED_TEAM_CONFIG,
    );
  }

  /**
   * §17.5/§44 — Surrogate-modulated loop only
   */
  runSurrogateLoopOnly(
    plan: SimulationPlan,
    zones: SimulationZone[],
    scenario: ScenarioSeed,
    surrogate?: SurrogateModel,
    mcConfig: Partial<MonteCarloConfig> = {},
    surrogateConfig?: SurrogateConfig,
  ): SurrogateLoopResult {
    const fullMcConfig = { ...DEFAULT_MONTE_CARLO_CONFIG, ...mcConfig };
    return runSurrogateLoop(
      plan,
      zones,
      scenario,
      fullMcConfig,
      surrogateConfig,
      surrogate,
    );
  }
}
