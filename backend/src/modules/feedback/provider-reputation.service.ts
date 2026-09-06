// §20.3 — Provider Reputation with fair attribution.
// Adjudicate provider-failure vs platform-induced-failure before penalty.
// Reputation gates directed-flow priority only, never punitive pricing.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { ProviderReputation, FailureAdjudication } from "./types";

/** §20.3 — Priority gating threshold */
const PRIORITY_GATE_THRESHOLD = 0.3;

@Injectable()
export class ProviderReputationService {
  private readonly logger = new Logger(ProviderReputationService.name);

  /** Provider reputation state */
  private readonly reputations = new Map<string, ProviderReputation>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §20.3 — Get or initialize reputation for a provider.
   */
  getReputation(providerRef: string): ProviderReputation {
    let rep = this.reputations.get(providerRef);
    if (!rep) {
      rep = {
        providerRef,
        score: 1.0,
        failureCount: 0,
        platformInducedFailures: 0,
        successCount: 0,
        priorityGated: false,
      };
      this.reputations.set(providerRef, rep);
    }
    return rep;
  }

  /**
   * §20.3 — Adjudicate a failure: platform-induced vs provider fault.
   * Must be called BEFORE any penalty is applied.
   */
  async adjudicateFailure(
    providerRef: string,
    adjudication: Omit<FailureAdjudication, "providerRef" | "adjudicatedAt">,
  ): Promise<Result<FailureAdjudication>> {
    const full: FailureAdjudication = {
      ...adjudication,
      providerRef,
      adjudicatedAt: new Date(),
    };

    const rep = this.getReputation(providerRef);

    if (full.platformInduced) {
      // §20.3: Platform-induced failure does NOT penalize provider
      rep.platformInducedFailures++;
      this.logger.log(
        `§20.3: Failure adjudicated as PLATFORM-INDUCED for ${providerRef} (root cause: ${full.rootCause}); no penalty applied`,
      );
    } else {
      // Provider fault: apply reputation penalty
      rep.failureCount++;
      const totalEvents = rep.successCount + rep.failureCount;
      rep.score = totalEvents > 0
        ? rep.successCount / totalEvents
        : 1.0;
      rep.priorityGated = rep.score < PRIORITY_GATE_THRESHOLD;

      this.logger.log(
        `§20.3: Failure adjudicated as PROVIDER-FAULT for ${providerRef}: score=${rep.score.toFixed(3)}, gated=${rep.priorityGated}`,
      );
    }

    rep.lastAdjudicationAt = full.adjudicatedAt;

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "ProviderFailureAdjudicated",
      aggregateId: providerRef,
      version: 1,
      payload: {
        providerRef,
        platformInduced: full.platformInduced,
        rootCause: full.rootCause,
        confidence: full.confidence,
        newScore: rep.score,
        priorityGated: rep.priorityGated,
      },
    });
    await this.eventBus.publish(event);

    return ok(full);
  }

  /**
   * §20.3 — Record a successful fulfillment.
   */
  recordSuccess(providerRef: string): void {
    const rep = this.getReputation(providerRef);
    rep.successCount++;
    const totalEvents = rep.successCount + rep.failureCount;
    rep.score = totalEvents > 0 ? rep.successCount / totalEvents : 1.0;
    rep.priorityGated = rep.score < PRIORITY_GATE_THRESHOLD;
  }

  /**
   * §20.3 — Check if a provider is gated from directed-flow priority.
   * Reputation gates directed-flow priority only, never punitive pricing.
   */
  isPriorityGated(providerRef: string): boolean {
    const rep = this.getReputation(providerRef);
    return rep.priorityGated;
  }

  /**
   * §20.3 — Get all reputations.
   */
  getAllReputations(): ProviderReputation[] {
    return Array.from(this.reputations.values()).map((r) => ({ ...r }));
  }

  /**
   * §20.3 — Get providers eligible for directed-flow (not gated).
   */
  getDirectedFlowEligible(): string[] {
    return Array.from(this.reputations.entries())
      .filter(([, rep]) => !rep.priorityGated)
      .map(([ref]) => ref);
  }
}
