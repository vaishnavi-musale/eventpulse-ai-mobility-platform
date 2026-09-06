// §15 — Hierarchical forecast models with a fallback chain (15–60 min horizon).
// Each model produces an UncertainValue. The chain prefers a high-precision
// model and falls back to simpler models when data/calibration are insufficient.
import { UncertainValue } from "@core/common/uncertain-value";

export type ForecastHorizon = 15 | 30 | 45 | 60;

export interface ForecastInput {
  zone: string;
  eventClass: string;
  horizonMin: ForecastHorizon;
  /** current estimated occupancy (12) from L2. */
  currentOccupancy: number;
  /** recent history (counts) for drift/trend fitting. */
  history: number[];
  /** commitment-conditioned expected arrivals (§15.2). */
  committedArrivals: number;
  weatherFeatures?: WeatherFeatures;
}

export interface WeatherFeatures {
  precipitationMm: number;
  indoorCapacityFactor: number; // rain-floor factor (§15.4)
  isRain: boolean;
}

export interface ForecastModel {
  readonly name: string;
  /** confidence of applicability given available data (0..1). */
  readonly fitness: number;
  forecast(input: ForecastInput): UncertainValue;
}

export interface ForecastResult extends ForecastInput {
  value: UncertainValue;
  modelUsed: string;
  fallbackDepth: number;
}

/** §15 — naive/seasonal fallback: recent mean + noise. */
class MeanModel implements ForecastModel {
  readonly name = "mean-baseline";
  forecast(input: ForecastInput): UncertainValue {
    const base = input.history.length
      ? input.history.reduce((s, x) => s + x, 0) / input.history.length
      : input.currentOccupancy;
    const sigma = Math.max(base * 0.1, 1);
    return {
      value: base,
      ciLower: base - 1.96 * sigma,
      ciUpper: base + 1.96 * sigma,
      confidenceLevel: 0.95,
      calibrationRating: "uncalibrated",
    };
  }
  get fitness() {
    return 0.4;
  }
}

/** §15 — trend + seasonality model (hierarchical: higher tier). */
class TrendSeasonalModel implements ForecastModel {
  readonly name = "trend-seasonal";
  forecast(input: ForecastInput): UncertainValue {
    const n = input.history.length;
    if (n === 0) {
      const base = input.currentOccupancy;
      return {
        value: base,
        ciLower: base,
        ciUpper: base,
        confidenceLevel: 0.95,
        calibrationRating: "uncalibrated",
      };
    }
    // Linear trend from history.
    const xs = input.history.map((_, i) => i);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = input.history.reduce((a, b) => a + b, 0) / n;
    const slope =
      xs.reduce((s, x, i) => s + (x - meanX) * (input.history[i] - meanY), 0) /
      Math.max(
        1e-9,
        xs.reduce((s, x) => s + (x - meanX) ** 2, 0),
      );
    const trendPart = meanY + slope * (n + input.horizonMin / 15);
    const residualStd = Math.max(
      Math.sqrt(input.history.reduce((s, y) => s + (y - meanY) ** 2, 0) / n),
      1,
    );
    const value = trendPart + (input.committedArrivals || 0) * 0.9;
    const sigma = residualStd * (1 + input.horizonMin / 30);
    return {
      value,
      ciLower: value - 1.96 * sigma,
      ciUpper: value + 1.96 * sigma,
      confidenceLevel: 0.95,
      calibrationRating: "uncalibrated",
    };
  }
  get fitness() {
    return 0.75;
  }
}

export const FORECAST_MODELS: ForecastModel[] = [
  new TrendSeasonalModel(),
  new MeanModel(),
];

/**
 * §15 — fallback chain: try models in order of fitness; return the first whose
 * fitness clears the gate, else the last resort (mean). Applies rain-floor
 * logic (§15.4) when weather is present.
 */
export function forecastWithFallback(input: ForecastInput): ForecastResult {
  const candidates = [...FORECAST_MODELS].sort((a, b) => b.fitness - a.fitness);
  let used: ForecastModel | null = null;
  let depth = 0;
  for (const m of candidates) {
    if (m.fitness >= 0.5 || depth === candidates.length - 1) {
      used = m;
      break;
    }
    depth++;
  }
  const model = used ?? candidates[candidates.length - 1];
  let value = model.forecast(input);

  // §15.4 — rain-floor: indoor capacity × rain_factor (never below floor).
  if (input.weatherFeatures?.isRain) {
    const floor =
      input.currentOccupancy * input.weatherFeatures.indoorCapacityFactor;
    if (value.value < floor) {
      value = {
        ...value,
        value: floor,
        ciLower: Math.max(value.ciLower, floor),
      };
    }
  }

  return {
    ...input,
    value,
    modelUsed: model.name,
    fallbackDepth: depth,
  };
}
