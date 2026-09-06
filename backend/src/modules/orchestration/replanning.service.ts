// §21.4 — Replanning with adaptive hysteresis.
// Replan only when deviations ≥ Nₐ(t) where Nₐ=f(time-to-danger, dynamics).
// High danger→N=1 w/ priority, steady state→N=3+; persistence bonus, no flapping.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { DeviationMeasurement, ReplanState } from "./types";

/** Initial hysteresis threshold */
const INITIAL_THRESHOLD = 3;

/** Minimum threshold (high danger) */
const MIN_THRESHOLD = 1;

/** Maximum threshold (steady state) */
const MAX_THRESHOLD = 5;

/** Persistence bonus increment */
const PERSISTENCE_BONUS_INCREMENT = 1;

/** Steady-state detection count */
const STEADY_STATE_COUNT = 5;

@Injectable()
export class ReplanningService {
  private readonly logger = new Logger(ReplanningService.name);

  /** Per-zone replan state */
  private readonly zoneStates = new Map<string, ReplanState>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §21.4 — Evaluate whether replanning is needed for a zone.
   * Deviations must exceed Nₐ(t) where Nₐ = f(time-to-danger, dynamics).
   */
  evaluateDeviation(
    zoneRef: string,
    measurement: DeviationMeasurement,
  ): DeviationMeasurement {
    const state = this.getOrCreateState(zoneRef);

    // Compute adaptive threshold Nₐ(t)
    const adaptiveThreshold = this.computeAdaptiveThreshold(
      measurement.timeToDanger,
      measurement.dynamicsScore,
      state,
    );

    measurement.replanThreshold = adaptiveThreshold;
    measurement.replanTriggered =
      measurement.currentDeviation >= adaptiveThreshold;

    return measurement;
  }

  /**
   * §21.4 — Process a replanning decision.
   */
  async processReplanDecision(
    zoneRef: string,
    measurement: DeviationMeasurement,
  ): Promise<{ replanned: boolean; reason: string }> {
    const state = this.getOrCreateState(zoneRef);

    if (!measurement.replanTriggered) {
      // Steady state: increment persistence bonus
      state.steadyCount++;
      if (state.steadyCount >= STEADY_STATE_COUNT) {
        state.persistenceBonus = Math.min(
          state.persistenceBonus + PERSISTENCE_BONUS_INCREMENT,
          MAX_THRESHOLD - INITIAL_THRESHOLD,
        );
      }
      return {
        replanned: false,
        reason: `§21.4: Deviation ${measurement.currentDeviation} below threshold ${measurement.replanThreshold}; steady count=${state.steadyCount}`,
      };
    }

    // Replan triggered
    state.steadyCount = 0;
    state.lastReplanAt = new Date();

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "PlanCommitted",
      aggregateId: zoneRef,
      version: 1,
      payload: {
        zoneRef,
        deviation: measurement.currentDeviation,
        threshold: measurement.replanThreshold,
        timeToDanger: measurement.timeToDanger,
        dynamicsScore: measurement.dynamicsScore,
        priority: measurement.timeToDanger < 30 ? "high" : "normal",
      },
    });
    await this.eventBus.publish(event);

    this.logger.log(
      `§21.4: Replan triggered for ${zoneRef}: deviation=${measurement.currentDeviation} ≥ threshold=${measurement.replanThreshold}`,
    );

    return {
      replanned: true,
      reason: `§21.4: Deviation ${measurement.currentDeviation} ≥ threshold ${measurement.replanThreshold}; time-to-danger=${measurement.timeToDanger}s`,
    };
  }

  /**
   * §21.4 — Compute adaptive threshold Nₐ(t).
   * High danger → N=1 with priority.
   * Steady state → N=3+.
   * Persistence bonus prevents flapping.
   */
  private computeAdaptiveThreshold(
    timeToDanger: number,
    dynamicsScore: number,
    state: ReplanState,
  ): number {
    // Base threshold inversely proportional to time-to-danger
    let base: number;
    if (timeToDanger < 15) {
      // Critical: threshold = 1
      base = MIN_THRESHOLD;
    } else if (timeToDanger < 60) {
      // Elevated: threshold = 2
      base = 2;
    } else {
      // Normal: threshold = 3
      base = INITIAL_THRESHOLD;
    }

    // Adjust for dynamics: more volatile → lower threshold
    const dynamicsAdjustment = Math.floor(dynamicsScore * 2);
    base = Math.max(MIN_THRESHOLD, base - dynamicsAdjustment);

    // Apply persistence bonus (increases threshold in steady state → less replanning)
    base = Math.min(MAX_THRESHOLD, base + state.persistenceBonus);

    return base;
  }

  /**
   * §21.4 — Get or create the replan state for a zone.
   */
  private getOrCreateState(zoneRef: string): ReplanState {
    let state = this.zoneStates.get(zoneRef);
    if (!state) {
      state = {
        currentThreshold: INITIAL_THRESHOLD,
        persistenceBonus: 0,
        lastReplanAt: new Date(0),
        steadyCount: 0,
      };
      this.zoneStates.set(zoneRef, state);
    }
    return state;
  }

  /**
   * §21.4 — Get the replan state for a zone (read-only).
   */
  getState(zoneRef: string): ReplanState | undefined {
    return this.zoneStates.get(zoneRef);
  }
}
