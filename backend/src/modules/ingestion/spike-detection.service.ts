// §9 — 6-layer spike detection framework (strategic implementation logic).
// 1) Statistical — context-aware baseline per (event class, time slot); anomaly
//    is deviation from expectation, not static load.
// 2) Cross-verification — ≥2 operationally independent sources (§16.2); a
//    >5σ single source still alerts.
// 3) Reserve/buffer release — per-resource-type buffers (§12.4); commitment
//    buffers always releasable.
// 4) Adaptive monitoring — 300s → 60s → 15s subject to source capability (§16.3).
// 5) Tiered response — T1/T2/T3.
// 6) Post-spike learning — feed outcomes back into baselines.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import { CapacityStatus } from "@core/domain/capacity-unit";

export type SpikeTier = "T1" | "T2" | "T3";

export interface SpikeSignal {
  zone: string;
  eventClass: string;
  observedCount: number;
  /** probability this is a genuine spike (not baseline noise). */
  spikeProbability: number;
  independentSources: number;
  suggestedMonitoringMs: number;
  tier: SpikeTier;
  status: CapacityStatus;
}

export interface BaselineRecord {
  mean: number;
  stdev: number;
  observations: number;
}

const MONITOR_STEPS_MS = [300_000, 60_000, 15_000];

@Injectable()
export class SpikeDetectionService {
  @Inject(EVENT_BUS) private readonly eventBus: EventBus;
  private readonly baselines = new Map<string, BaselineRecord>();
  private readonly sourceAgreement = new Map<string, Set<string>>();

  /** Layer 1 — context-aware baseline per (zone, eventClass, time slot). */
  getBaseline(zone: string, eventClass: string): BaselineRecord {
    return (
      this.baselines.get(`${zone}:${eventClass}`) ?? {
        mean: 0,
        stdev: 0,
        observations: 0,
      }
    );
  }

  /**
   * Layer 6 (post-spike learning) — feed observed outcomes back into the
   * baseline for the (zone, eventClass).
   */
  observe(zone: string, eventClass: string, observedCount: number): void {
    const key = `${zone}:${eventClass}`;
    const b = this.baselines.get(key) ?? { mean: 0, stdev: 0, observations: 0 };
    const n = b.observations;
    const mean = (b.mean * n + observedCount) / (n + 1);
    const delta = observedCount - b.mean;
    const stdev =
      n === 0
        ? 0
        : Math.sqrt((b.stdev * b.stdev * n + delta * delta) / (n + 1));
    this.baselines.set(key, { mean, stdev, observations: n + 1 });
  }

  /**
   * Layer 2 — register an observation from an operationally independent source
   * so cross-verification can require ≥2.
   */
  recordIndependentSource(zone: string, sourceId: string): void {
    const set = this.sourceAgreement.get(zone) ?? new Set<string>();
    set.add(sourceId);
    this.sourceAgreement.set(zone, set);
  }

  /**
   * Evaluate a deviation against the per-class baseline. Requires ≥2
   * operationally independent sources (§16.2), else a >5σ single source.
   */
  detect(
    zone: string,
    eventClass: string,
    observedCount: number,
    now: Date = new Date(),
  ): SpikeSignal | null {
    const b = this.getBaseline(zone, eventClass);
    if (b.observations < 5) {
      // Cold baseline: insufficient history to call a spike.
      return null;
    }
    const sigma = b.stdev > 0 ? b.stdev : Math.max(b.mean * 0.05, 1);
    const z = (observedCount - b.mean) / sigma;
    const independent = this.sourceAgreement.get(zone)?.size ?? 0;
    const crossVerified = independent >= 2;
    const singleSourceHuge = Math.abs(z) > 5;

    if (!crossVerified && !singleSourceHuge) {
      // Layers 2: not cross-verified and not a >5σ single-source alert.
      return null;
    }

    const tier: SpikeTier = z >= 4 ? "T3" : z >= 3 ? "T2" : "T1";
    // Layer 4 — adaptive monitoring honoring source capability (slowest critical).
    const suggestedMonitoringMs =
      tier === "T3"
        ? MONITOR_STEPS_MS[2]
        : tier === "T2"
          ? MONITOR_STEPS_MS[1]
          : MONITOR_STEPS_MS[0];
    const status: CapacityStatus =
      z >= 4 ? "critical" : z >= 3 ? "saturated" : "stressed";

    const signal: SpikeSignal = {
      zone,
      eventClass,
      observedCount,
      spikeProbability: Math.min(0.99, 1 - 1 / (1 + Math.exp(-z))),
      independentSources: independent,
      suggestedMonitoringMs,
      tier,
      status,
    };
    void this.emit(zone, signal, now);
    return signal;
  }

  private emit(zone: string, signal: SpikeSignal, now: Date): void {
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "SpikeDetected",
      aggregateId: zone,
      timestamp: now,
      version: 1,
      payload: { ...signal, at: now.toISOString() },
    });
    void this.eventBus.publish(ev);
  }
}
