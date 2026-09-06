// §20.5 — Provider starvation / winner-takes-all watch.
// Run economic sim; if Herfindahl-like concentration index breaches threshold
// → add exploration/equity term to allocation.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { ConcentrationIndex } from "./types";

/** §20.5 — HHI threshold above which exploration is added */
const HHI_EXPLORATION_THRESHOLD = 0.25;

@Injectable()
export class ProviderStarvationWatchService {
  private readonly logger = new Logger(ProviderStarvationWatchService.name);

  /** Concentration index per zone */
  private readonly concentrationIndices = new Map<string, ConcentrationIndex>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §20.5 — Compute Herfindahl-Hirschman Index for directed flow in a zone.
   * HHI = Σ(si²) where si is the market share of provider i.
   * Range: 0 (perfect competition) to 1 (monopoly).
   */
  computeConcentrationIndex(
    zoneRef: string,
    providerFlowShares: Record<string, number>,
  ): ConcentrationIndex {
    let hhi = 0;
    for (const [, share] of Object.entries(providerFlowShares)) {
      hhi += share * share;
    }

    const explorationAdded = hhi > HHI_EXPLORATION_THRESHOLD;

    const index: ConcentrationIndex = {
      zoneRef,
      hhi,
      threshold: HHI_EXPLORATION_THRESHOLD,
      explorationAdded,
      providerShares: { ...providerFlowShares },
    };

    this.concentrationIndices.set(zoneRef, index);

    if (explorationAdded) {
      this.logger.warn(
        `§20.5: HHI=${hhi.toFixed(4)} exceeds threshold ${HHI_EXPLORATION_THRESHOLD} in ${zoneRef}; adding exploration/equity term`,
      );
    }

    return index;
  }

  /**
   * §20.5 — Emit event when concentration triggers exploration.
   */
  async triggerExploration(
    zoneRef: string,
    index: ConcentrationIndex,
  ): Promise<void> {
    if (!index.explorationAdded) return;

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "BaselineUpdated",
      aggregateId: zoneRef,
      version: 1,
      payload: {
        zoneRef,
        hhi: index.hhi,
        threshold: index.threshold,
        action: "exploration_added",
        providerShares: index.providerShares,
        reason: `§20.5: Concentration index ${index.hhi.toFixed(4)} breached threshold; adding exploration term to prevent winner-takes-all`,
      },
    });
    await this.eventBus.publish(event);
  }

  /**
   * §20.5 — Get concentration index for a zone.
   */
  getConcentrationIndex(zoneRef: string): ConcentrationIndex | undefined {
    return this.concentrationIndices.get(zoneRef);
  }

  /**
   * §20.5 — Simulate allocation with exploration term.
   * Returns adjusted shares with exploration bonus for underrepresented providers.
   */
  simulateWithExploration(
    providerShares: Record<string, number>,
    explorationBonus: number = 0.1,
  ): Record<string, number> {
    const adjusted = { ...providerShares };
    const minShare = Math.min(...Object.values(adjusted));
    const totalShares = Object.values(adjusted).reduce((a, b) => a + b, 0);

    // Add exploration bonus to the weakest provider
    const weakest = Object.entries(adjusted).find(
      ([, s]) => s === minShare,
    );
    if (weakest) {
      const [ref] = weakest;
      adjusted[ref] = Math.min(1, adjusted[ref] + explorationBonus);
    }

    // Renormalize
    const newTotal = Object.values(adjusted).reduce((a, b) => a + b, 0);
    for (const ref of Object.keys(adjusted)) {
      adjusted[ref] = adjusted[ref] / newTotal;
    }

    void totalShares;
    return adjusted;
  }
}
