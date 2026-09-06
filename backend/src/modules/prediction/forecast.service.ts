// §15 — L4 Forecast orchestration.
// Commitment-conditioned forecasts (§15.2), concept-drift detection,
// cold-start event-class priors (§15.3), calibration ratings travel with the
// forecast into the EventBus.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import { UncertainValue } from "@core/common/uncertain-value";
import {
  ForecastInput,
  ForecastResult,
  forecastWithFallback,
} from "./forecast-models";
import { CalibrationService, StratumKey } from "./calibration.service";
import { WeatherService } from "./weather.service";

/** §15.3 — event-class prior multiplier + widened interval until N≥5. */
export interface EventClassPrior {
  eventClass: string;
  /** prior multiplier vs baseline (e.g. concert ≈ 2.3×). */
  multiplier: number;
  observations: number;
}

const EVENT_CLASS_PRIORS: Record<string, EventClassPrior> = {
  concert: { eventClass: "concert", multiplier: 2.3, observations: 0 },
  mega_event: { eventClass: "mega_event", multiplier: 3.0, observations: 0 },
  default: { eventClass: "default", multiplier: 1.0, observations: 0 },
};

export interface DriftMonitor {
  /** windowed mean residual — persistent sign indicates drift. */
  residualMean: number;
  driftDetected: boolean;
}

@Injectable()
export class ForecastService {
  private readonly priors = new Map<string, EventClassPrior>(
    Object.entries(EVENT_CLASS_PRIORS),
  );
  private readonly drifts = new Map<string, DriftMonitor>();
  private readonly history = new Map<string, number[]>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly calibration: CalibrationService,
    private readonly weather: WeatherService,
  ) {}

  /** §15.3 — register a comparable observation for cold-start gating. */
  recordObservation(zone: string, eventClass: string, actual: number): void {
    const key = `${zone}:${eventClass}`;
    const h = this.history.get(key) ?? [];
    h.push(actual);
    this.history.set(key, h.slice(-200));
    const prior = this.priors.get(eventClass);
    if (prior) {
      this.priors.set(eventClass, {
        ...prior,
        observations: prior.observations + 1,
      });
    }
  }

  /** §15.3 — apply class prior with widened CI until N≥5 observations. */
  private applyColdStartPrior(
    input: ForecastInput,
    value: UncertainValue,
  ): UncertainValue {
    const prior = this.priors.get(input.eventClass);
    if (!prior || prior.multiplier === 1) return value;
    const n = prior.observations;
    // Synthetic pre-training / transfer is a PRIOR, never evidence (§15.3).
    const widened = n < 5; // widened intervals until N≥5 comparable observations
    const valueScaled = value.value * prior.multiplier;
    const widenFactor = widened ? 1 + (5 - Math.max(n, 1)) * 0.4 : 1;
    const halfWidth = Math.max(value.ciUpper - value.value, 1) * widenFactor;
    return {
      value: valueScaled,
      ciLower: valueScaled - halfWidth,
      ciUpper: valueScaled + halfWidth,
      confidenceLevel: widened ? 0.8 : value.confidenceLevel, // honest lower confidence
      calibrationRating: "uncalibrated", // never claim calibration on cold start
    };
  }

  /** §15 — concept-drift detection on the residual between forecast and actual. */
  detectDrift(zone: string, residual: number): boolean {
    const key = zone;
    const m = this.drifts.get(key) ?? { residualMean: 0, driftDetected: false };
    m.residualMean = 0.8 * m.residualMean + 0.2 * residual;
    const drift = Math.abs(m.residualMean) > 20; // persistent bias of 20 units
    m.driftDetected = drift;
    this.drifts.set(key, m);
    return drift;
  }

  /**
   * §15/§23 — produce a forecast, attach the stratified calibration rating,
   * and emit ForecastEmitted into the EventBus.
   */
  async forecast(
    input: ForecastInput,
    now: Date = new Date(),
  ): Promise<
    ForecastResult & { calibrationRating: string; abnormalCoverage: boolean }
  > {
    const withWeather: ForecastInput = {
      ...input,
      weatherFeatures: input.weatherFeatures ?? this.weather.features(),
    };
    let result = forecastWithFallback(withWeather);
    result = {
      ...result,
      value: this.applyColdStartPrior(withWeather, result.value),
    };

    const stratum: StratumKey = {
      model: result.modelUsed,
      horizon: input.horizonMin,
      zone: input.zone,
      eventClass: input.eventClass,
    };
    const rating = this.calibration.ratingForStratum(stratum);
    const ratingState = this.calibration.rate(stratum);

    const payload = {
      zone: input.zone,
      eventClass: input.eventClass,
      horizonMin: input.horizonMin,
      value: result.value,
      modelUsed: result.modelUsed,
      calibrationRating: rating,
      abnormalCoverage: ratingState.abnormalWellCovered,
      at: now.toISOString(),
    };
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "ForecastEmitted",
      aggregateId: input.zone,
      timestamp: now,
      version: 1,
      payload,
    });
    await this.eventBus.publish(ev);

    return {
      ...result,
      calibrationRating: rating,
      abnormalCoverage: ratingState.abnormalWellCovered,
    };
  }
}
