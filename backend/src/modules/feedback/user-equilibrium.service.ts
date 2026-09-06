// §21.5 — User-Equilibrium Guard.
// MNL route-choice model; downrank plan if ||UE_flow − SO_flow|| > δ on critical links.
// Guard detects/mitigates, claims no universal solution.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { UserEquilibriumGuard as UEGuardResult } from "./types";

@Injectable()
export class UserEquilibriumGuardService {
  private readonly logger = new Logger(UserEquilibriumGuardService.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §21.5 — Evaluate User Equilibrium vs System Optimal.
   * Returns deviation metrics and whether guard triggered.
   */
  evaluate(
    soFlow: Record<string, number>,
    ueFlow: Record<string, number>,
    threshold: number = 0.2,
  ): UEGuardResult {
    const criticalLinks = Object.keys(soFlow);
    const maxDeviation = this.computeMaxDeviation(soFlow, ueFlow, criticalLinks);
    const triggered = maxDeviation > threshold;

    const recommendation = triggered
      ? `§21.5: UE-SO deviation ${maxDeviation.toFixed(4)} exceeds threshold ${threshold} on critical links; downrank plan and re-optimize`
      : `§21.5: UE-SO deviation ${maxDeviation.toFixed(4)} within threshold ${threshold}; plan is equilibrium-compatible`;

    if (triggered) {
      this.logger.warn(recommendation);
    }

    return {
      soFlow: { ...soFlow },
      ueFlow: { ...ueFlow },
      maxDeviation,
      threshold,
      triggered,
      recommendation,
    };
  }

  /**
   * §21.5 — Compute MNL (Multinomial Logit) route choice probabilities.
   * P(route k) = exp(V_k) / Σ exp(V_j)
   */
  computeMNLProbabilities(
    routeUtilities: Record<string, number>,
  ): Record<string, number> {
    const expValues: Record<string, number> = {};
    let sumExp = 0;

    for (const [route, utility] of Object.entries(routeUtilities)) {
      expValues[route] = Math.exp(utility);
      sumExp += expValues[route];
    }

    const probabilities: Record<string, number> = {};
    for (const [route, expVal] of Object.entries(expValues)) {
      probabilities[route] = sumExp > 0 ? expVal / sumExp : 1 / Object.keys(routeUtilities).length;
    }

    return probabilities;
  }

  /**
   * §21.5 — Compute UE flow from MNL route choice.
   * Simulates user behavior given route utilities.
   */
  computeUEFlow(
    routeUtilities: Record<string, number>,
    totalDemand: number,
  ): Record<string, number> {
    const probs = this.computeMNLProbabilities(routeUtilities);
    const flow: Record<string, number> = {};

    for (const [route, prob] of Object.entries(probs)) {
      flow[route] = prob * totalDemand;
    }

    return flow;
  }

  /**
   * §21.5 — Emit guard event when UE deviation is too high.
   */
  async emitGuardTrigger(
    zoneRef: string,
    guardResult: UEGuardResult,
  ): Promise<void> {
    if (!guardResult.triggered) return;

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "BaselineUpdated",
      aggregateId: zoneRef,
      version: 1,
      payload: {
        type: "ue_guard_triggered",
        zoneRef,
        maxDeviation: guardResult.maxDeviation,
        threshold: guardResult.threshold,
        recommendation: guardResult.recommendation,
      },
    });
    await this.eventBus.publish(event);
  }

  /**
   * §21.5 — Compute maximum absolute deviation across critical links.
   */
  private computeMaxDeviation(
    soFlow: Record<string, number>,
    ueFlow: Record<string, number>,
    criticalLinks: string[],
  ): number {
    let maxDev = 0;
    for (const link of criticalLinks) {
      const so = soFlow[link] ?? 0;
      const ue = ueFlow[link] ?? 0;
      const maxFlow = Math.max(Math.abs(so), Math.abs(ue), 1);
      const deviation = Math.abs(ue - so) / maxFlow;
      maxDev = Math.max(maxDev, deviation);
    }
    return maxDev;
  }
}
