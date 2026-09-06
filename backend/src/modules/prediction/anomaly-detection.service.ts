// §16 — Anomaly detection (cross-cutting filter).
// §16.1 — candidates benchmarked (Gaussian 3σ demoted from default to ONE
// option): robust z (MAD-based), quantile thresholds, EWMA/CUSUM, and Bayesian
// anomaly probability. Crowd data are non-normal/autocorrelated, so the
// benchmark artifact matters. Configuration picks the method per metric.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";

export type AnomalyMethod =
  "robust_z_mad" | "quantile" | "ewma_cusum" | "bayesian" | "gaussian_3sigma";

export interface AnomalyDecision {
  zone: string;
  method: AnomalyMethod;
  /** 0..1 anomaly probability (Bayesian) or threshold-derived score. */
  anomalyScore: number;
  isAnomaly: boolean;
}

@Injectable()
export class AnomalyDetectionService {
  @Inject(EVENT_BUS) private readonly eventBus: EventBus;

  median(values: number[]): number {
    if (values.length === 0) return 0;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  /** Robust z-score (MAD-based) — §16.1 candidate 1. */
  robustZMAD(x: number, ordered: number[]): { z: number; threshold: number } {
    const med = this.median(ordered);
    const mad = this.median(ordered.map((v) => Math.abs(v - med)));
    const sigma = 1.4826 * mad || Math.max(1e-9, this.median(ordered) * 0.05);
    const z = (x - med) / sigma;
    return { z, threshold: 3.5 }; // robust z uses ~3.5 MAD threshold
  }

  /** Quantile threshold — §16.1 candidate 2. */
  quantile(
    x: number,
    ordered: number[],
    p = 0.975,
  ): { q: number; isAnomaly: boolean } {
    const s = [...ordered].sort((a, b) => a - b);
    if (s.length === 0) return { q: x, isAnomaly: false };
    const idx = Math.min(s.length - 1, Math.floor(p * s.length));
    const q = s[idx];
    return { q, isAnomaly: x > q };
  }

  /**
   * EWMA + CUSUM — §16.1 candidate 3. Detects persistent small shifts that a
   * pointwise threshold misses.
   */
  ewmaCusum(
    x: number,
    history: number[],
    lambda = 0.3,
    k = 0.5,
  ): { cusumPositive: number; isAnomaly: boolean } {
    const mean = history.length
      ? history.reduce((a, b) => a + b, 0) / history.length
      : x;
    const std = Math.max(
      1,
      Math.sqrt(
        history.reduce((s, v) => s + (v - mean) ** 2, 0) /
          Math.max(1, history.length),
      ),
    );
    let ewma = mean;
    let cusum = 0;
    for (const v of history) {
      ewma = lambda * v + (1 - lambda) * ewma;
    }
    const normalized = (x - ewma) / std;
    cusum = Math.max(0, cusum + (normalized - k));
    const isAnomaly = cusum > 4.0; // decision interval h=4 (CUSUM)
    return { cusumPositive: cusum, isAnomaly };
  }

  /**
   * Bayesian anomaly probability — §16.1 candidate 4. Anomaly prob from a
   * Gaussian-generative model with a small outlier mixing fraction.
   */
  bayesian(
    x: number,
    history: number[],
  ): { anomalyProbability: number; isAnomaly: boolean } {
    const mean = history.length
      ? history.reduce((a, b) => a + b, 0) / history.length
      : x;
    const varNum =
      history.reduce((s, v) => s + (v - mean) ** 2, 0) /
      Math.max(1, history.length);
    const sigma = Math.sqrt(varNum) || 1;
    const z = (x - mean) / sigma;
    // Bernoulli-mix: P(anomaly) ∝ outlier prior × normal-density ratio.
    const normalDensity =
      Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    const outlierDensity = 1 / (2 * 3 * sigma); // uniform over ±3σ
    const anomalyProbability =
      outlierDensity / (outlierDensity + normalDensity + 1e-9);
    return { anomalyProbability, isAnomaly: anomalyProbability > 0.5 };
  }

  /**
   * §16.1 — evaluate a point against a chosen benchmark. Gaussian 3σ is just
   * one option (default NOT), configurable per metric.
   */
  evaluate(
    zone: string,
    x: number,
    history: number[],
    method: AnomalyMethod = "robust_z_mad",
  ): AnomalyDecision {
    const ordered = history.length ? history : [x];
    let score = 0;
    let isAnomaly = false;
    switch (method) {
      case "robust_z_mad": {
        const { z, threshold } = this.robustZMAD(x, ordered);
        score = Math.min(1, Math.abs(z) / threshold);
        isAnomaly = Math.abs(z) > threshold;
        break;
      }
      case "quantile": {
        const r = this.quantile(x, ordered);
        score = r.isAnomaly ? 0.85 : 0.1;
        isAnomaly = r.isAnomaly;
        break;
      }
      case "ewma_cusum": {
        const r = this.ewmaCusum(x, ordered);
        score = Math.min(1, r.cusumPositive / 4);
        isAnomaly = r.isAnomaly;
        break;
      }
      case "bayesian": {
        const r = this.bayesian(x, ordered);
        score = r.anomalyProbability;
        isAnomaly = r.isAnomaly;
        break;
      }
      case "gaussian_3sigma": {
        const mean = ordered.reduce((a, b) => a + b, 0) / ordered.length;
        const sigma =
          Math.sqrt(
            ordered.reduce((s, v) => s + (v - mean) ** 2, 0) / ordered.length,
          ) || 1;
        const z = (x - mean) / sigma;
        score = Math.min(1, Math.abs(z) / 3);
        isAnomaly = Math.abs(z) > 3; // ONE candidate, not default
        break;
      }
    }
    return { zone, method, anomalyScore: score, isAnomaly };
  }

  /** Emit AnomalyDetected for the broader pipeline when confirmed. */
  async emitIfAnomaly(zone: string, decision: AnomalyDecision): Promise<void> {
    if (!decision.isAnomaly) return;
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "AnomalyDetected",
      aggregateId: zone,
      timestamp: new Date(),
      version: 1,
      payload: decision,
    });
    await this.eventBus.publish(ev);
  }
}
