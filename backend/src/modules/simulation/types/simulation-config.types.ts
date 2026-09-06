// §17/§44 — Monte Carlo and surrogate loop configuration
import type { WeatherCondition } from "./scenario.types";

export interface MonteCarloConfig {
  /** Number of simulation iterations */
  n: number;
  /** Whether to use importance sampling for tail estimation */
  importanceSampling: boolean;
  /** Target tail probability for importance sampling threshold */
  tailThreshold: number;
  /** Variance reduction: antithetic variates */
  antitheticVariates: boolean;
  /** Variance reduction: control variates */
  controlVariates: boolean;
  /** Confidence level for output CIs */
  ciLevel: number;
}

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  n: 1000,
  importanceSampling: false,
  tailThreshold: 0.1,
  antitheticVariates: true,
  controlVariates: false,
  ciLevel: 0.9,
};

// §17.5 — Surrogate-modulated loop
export interface SurrogateConfig {
  /** Iteration counts to run: 1, 2, 3, 5 */
  iterationCounts: number[];
  /** Whether to apply bias correction */
  biasCorrectionEnabled: boolean;
  /** Validity gate: max acceptable surrogate-sim divergence */
  validityGateMaxDivergence: number;
}

export const DEFAULT_SURROGATE_CONFIG: SurrogateConfig = {
  iterationCounts: [1, 2, 3, 5],
  biasCorrectionEnabled: true,
  validityGateMaxDivergence: 0.15,
};

// §17.5/§44 — Surrogate bias correction: b(z, size, plan_type, weather)
export interface SurrogateBiasContext {
  zoneId: string;
  zoneSize: number;
  planType: string;
  weatherCondition: WeatherCondition;
}

export interface SurrogateBiasCorrection {
  context: SurrogateBiasContext;
  /** E[sim - surrogate | context] */
  biasEstimate: number;
  /** Standard error of bias estimate */
  biasStdError: number;
  /** Number of calibration samples */
  sampleCount: number;
  /** Whether validity gate passed */
  validityGatePassed: boolean;
}

export interface SimulationRunConfig {
  monteCarlo: MonteCarloConfig;
  surrogate: SurrogateConfig;
  /** Whether to run Shadow City counterfactual */
  shadowCityEnabled: boolean;
  /** Whether to run red-team stress tests */
  redTeamEnabled: boolean;
  /** Timeout in ms for a single simulation run */
  timeoutMs: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationRunConfig = {
  monteCarlo: DEFAULT_MONTE_CARLO_CONFIG,
  surrogate: DEFAULT_SURROGATE_CONFIG,
  shadowCityEnabled: true,
  redTeamEnabled: true,
  timeoutMs: 120_000,
};
