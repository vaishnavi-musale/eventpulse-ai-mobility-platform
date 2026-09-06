// §21 — Strategy-Aware Control & Reflexivity.
// The self-referential loop: our announced plan changes behavior, which changes
// load, which invalidates the plan. We model the crowd's reaction (reflexivity)
// and gate replanning with adaptive hysteresis (§21.4) plus a
// system-optimal-vs-user-equilibrium divergence metric (§21.5).
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";

/** §21.1 — Reflexivity/crowding-out model params (research assumption, §30 A). */
export interface ReflexivityConfig {
  /** Committed volume above which crowding-out becomes material. */
  headroom: number;
  /** Multiplicative crowding-out exponent (baseline model). */
  crowdingExponent: number;
  /** Additive alternative shift (benchmarked against multiplicative, §21.1). */
  additiveShift: number;
  /** Which functional form is currently configured. */
  form: "multiplicative" | "additive" | "nested";
}

/** §21.4 — Adaptive hysteresis state. */
export interface HysteresisState {
  zoneRef: string;
  /** Nₐ(t) = f(time_to_danger, dynamics) — current threshold. */
  currentThreshold: number;
  /** Persistent sign/bonus preventing flapping. */
  persistenceBonus: number;
  lastReplanAt: Date;
  steadyCount: number;
}

/** §21.5 — UE vs SO divergence report. */
export interface EquilibriumDivergence {
  zoneRef: string;
  maxDivergence: number;
  criticalLinks: string[];
  triggered: boolean;
  redZoneThreshold: number;
}

/** §21.2 — multi-platform coexistence: how aggressively we trust our own plan. */
export interface MultiPlatformState {
  /** uncertainty widening to apply when other platforms also steer the crowd. */
  wideningFactor: number;
  activeExchanges: number;
}

@Injectable()
export class StrategyAwareControlService {
  private readonly logger = new Logger(StrategyAwareControlService.name);

  private readonly reflexivity: ReflexivityConfig = {
    headroom: 5000,
    crowdingExponent: 1.2,
    additiveShift: 0.0,
    form: "multiplicative",
  };

  private readonly hysteresis = new Map<string, HysteresisState>();
  private readonly divergence = new Map<string, EquilibriumDivergence>();
  private readonly platforms: MultiPlatformState = {
    wideningFactor: 1.0,
    activeExchanges: 0,
  };

  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {}

  /** §21.1 — configure the reflexivity (crowding-out) model. */
  configureReflexivity(config: Partial<ReflexivityConfig>): ReflexivityConfig {
    Object.assign(this.reflexivity, config);
    return { ...this.reflexivity };
  }

  getReflexivityConfig(): ReflexivityConfig {
    return { ...this.reflexivity };
  }

  /**
   * §21.1 — effective compliance given announced committed volume vs headroom.
   * Baseline is multiplicative crowding-out; additive is a benchmarked
   * alternative (no claim of truth — research assumption, §30 A).
   */
  effectiveCompliance(baseCompliance: number, committedVolume: number): number {
    const { headroom, crowdingExponent, additiveShift, form } = this.reflexivity;
    if (committedVolume <= headroom) return baseCompliance;
    const crowding = (committedVolume - headroom) / Math.max(headroom, 1);
    let reduced: number;
    switch (form) {
      case "multiplicative":
        reduced = baseCompliance * Math.exp(-crowdingExponent * crowding);
        break;
      case "additive":
        reduced = Math.max(0, baseCompliance - additiveShift * crowding);
        break;
      case "nested":
      default:
        reduced =
          baseCompliance * Math.exp(-crowdingExponent * crowding) -
          additiveShift * crowding;
        reduced = Math.max(0, reduced);
        break;
    }
    return Math.min(baseCompliance, reduced);
  }

  /**
   * §21.4 — adaptive hysteresis: Nₐ(t) is a function of time-to-danger and
   * system dynamics. Low time-to-danger → N=1 with priority override;
   * steady state → N≥3. Persistence bonus prevents flapping.
   */
  adaptiveThreshold(
    zoneRef: string,
    timeToDangerSeconds: number,
    dynamicsScore: number,
  ): { threshold: number; reason: string } {
    const hysteresis = this.hysteresis.get(zoneRef) ?? {
      zoneRef,
      currentThreshold: 3,
      persistenceBonus: 0,
      lastReplanAt: new Date(),
      steadyCount: 0,
    };

    let threshold: number;
    let reason: string;
    if (timeToDangerSeconds < 60) {
      threshold = 1; // urgent: replan on first material deviation (priority override)
      reason = "low time-to-danger -> N=1 priority override";
    } else if (timeToDangerSeconds < 300) {
      threshold = 2;
      reason = "moderate time-to-danger -> N=2";
    } else if (dynamicsScore > 0.6) {
      threshold = 2;
      reason = "high dynamics -> lower threshold";
    } else {
      threshold = 3;
      reason = "steady state -> N=3+";
    }

    // Persistence bonus: a plan that has held for a while resists replanning.
    const heldMs = Date.now() - hysteresis.lastReplanAt.getTime();
    const persistenceBonus =
      heldMs > 10 * 60_000 ? 1 : heldMs > 30 * 60_000 ? 2 : 0;
    const effective = threshold + persistenceBonus;

    hysteresis.currentThreshold = effective;
    hysteresis.persistenceBonus = persistenceBonus;
    this.hysteresis.set(zoneRef, hysteresis);

    void this.logger.debug(
      `§21.4 [${zoneRef}] Nₐ=${effective} (${reason}, persistence +${persistenceBonus})`,
    );
    return { threshold: effective, reason: `${reason}; persistence bonus +${persistenceBonus}` };
  }

  /**
   * §21.4 — record a steady reading; reset only the counter while the plan holds.
   */
  recordSteady(zoneRef: string): void {
    const h = this.hysteresis.get(zoneRef) ?? {
      zoneRef,
      currentThreshold: 3,
      persistenceBonus: 0,
      lastReplanAt: new Date(),
      steadyCount: 0,
    };
    h.steadyCount++;
    this.hysteresis.set(zoneRef, h);
  }

  /** §21.4 — called when a replan is decided. */
  markReplanned(zoneRef: string): void {
    const h = this.hysteresis.get(zoneRef) ?? {
      zoneRef,
      currentThreshold: 3,
      persistenceBonus: 0,
      lastReplanAt: new Date(),
      steadyCount: 0,
    };
    h.lastReplanAt = new Date();
    h.steadyCount = 0;
    this.hysteresis.set(zoneRef, h);
  }

  getHysteresis(zoneRef: string): HysteresisState | undefined {
    const h = this.hysteresis.get(zoneRef);
    return h ? { ...h } : undefined;
  }

  /**
   * §21.5 — system-opt vs user-equilibrium divergence on critical links.
   * Reported as a metric with a red-zone threshold (guard mitigates, never
   * claims a universal solution).
   */
  divergenceOn(zoneRef: string, soFlow: Record<string, number>, ueFlow: Record<string, number>, redZone = 0.25): EquilibriumDivergence {
    const criticalLinks = Object.keys(soFlow);
    let maxDivergence = 0;
    for (const link of criticalLinks) {
      const so = soFlow[link] ?? 0;
      const ue = ueFlow[link] ?? 0;
      const norm = Math.max(Math.abs(so), Math.abs(ue), 1);
      maxDivergence = Math.max(maxDivergence, Math.abs(ue - so) / norm);
    }
    const report: EquilibriumDivergence = {
      zoneRef,
      criticalLinks,
      maxDivergence,
      triggered: maxDivergence > redZone,
      redZoneThreshold: redZone,
    };
    this.divergence.set(zoneRef, report);
    return report;
  }

  /** §21.2 — register an external platform exchange (widens our uncertainty). */
  registerPlatformExchange(count: number): MultiPlatformState {
    this.platforms.activeExchanges = count;
    // Each co-steering platform widens our trust band (never relies on induced flow).
    this.platforms.wideningFactor = 1 + count * 0.1;
    return { ...this.platforms };
  }

  getMultiPlatform(): MultiPlatformState {
    return { ...this.platforms };
  }

  /** §21 — emit a strategy-control event for the ledger. */
  async emitStrategyEvent(
    zoneRef: string,
    type: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "BaselineUpdated",
      aggregateId: zoneRef,
      version: 1,
      payload: { type: `strategy_${type}`, detail },
    });
    await this.eventBus.publish(ev);
  }
}
