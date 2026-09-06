// §25 — Commitment & Delivery Engine service
// Token lifecycle, escrow management, fulfillment verification,
// re-offering pipeline, and recommit SLA.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { EVENT_NAMES } from "../../core/domain/events/event-names";
import { GLevel } from "../../core/domain/g-level.enum";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { CommitmentTokenAggregate } from "./commitment-token.aggregate";
import {
  EscrowState,
  EscrowComputation,
  EscrowRequirement,
  FulfillmentEvidence,
  FulfillmentDecision,
  ReOfferingPipeline,
  RecommitSLA,
  DisputeRecord,
} from "./types";

/** §25.4 — Re-offering pipeline engineering target (S) in ms */
const REOFFERING_TARGET_MS = 90_000;

/** §25.6 — Recommit SLA target in ms */
const RECOMMIT_SLA_TARGET_MS = 5 * 60 * 1000;

@Injectable()
export class CommitmentDeliveryService {
  private readonly logger = new Logger(CommitmentDeliveryService.name);

  /** In-memory token store (would be EventStore projection in production) */
  private readonly tokens = new Map<string, CommitmentTokenAggregate>();

  /** §8.4 — Escrow state per zone */
  private readonly escrows = new Map<string, EscrowState>();

  /** §25.6 — Active recommit SLAs */
  private readonly recommitSLAs = new Map<string, RecommitSLA>();

  /** §25.4 — Active re-offering pipelines */
  private readonly pipelines = new Map<string, ReOfferingPipeline>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  // ── Token Lifecycle (§25) ──────────────────────────────────

  /**
   * §25 — Create and offer a new commitment token.
   */
  async offerToken(params: {
    attendeeRef: string;
    category: CommitmentTokenAggregate extends { category: infer C } ? C : never;
    capacityUnitRef: string;
    gLevel: GLevel;
    channel: "app" | "sms" | "pa" | "signage" | "staff" | "web";
    verificationMechanism: "scan" | "provider_receipt" | "staff_confirm" | "none";
    incentiveValue: number;
    cost: number;
    expiresAt: Date;
    timeWindowStart: Date;
    timeWindowEnd: Date;
    zoneRef: string;
  }): Promise<Result<{ tokenId: string }>> {
    // §8.4 — Check escrow cap before issuing
    const escrow = this.escrows.get(params.zoneRef);
    if (escrow && escrow.issuedCount >= escrow.issuedCap) {
      return err("ESCROW_CAP_EXCEEDED", "§8.4: Issued commitment cap reached; cannot issue more tokens", {
        zoneRef: params.zoneRef,
        issuedCount: escrow.issuedCount,
        cap: escrow.issuedCap,
      });
    }

    const tokenId = generateId();
    const aggregate = new CommitmentTokenAggregate();
    aggregate.init({
      tokenId,
      attendeeRef: params.attendeeRef,
      category: params.category,
      capacityUnitRef: params.capacityUnitRef,
      gLevel: params.gLevel,
      channel: params.channel,
      verificationMechanism: params.verificationMechanism,
      incentiveValue: params.incentiveValue,
      cost: params.cost,
      expiresAt: params.expiresAt,
      timeWindowStart: params.timeWindowStart,
      timeWindowEnd: params.timeWindowEnd,
      version: 1,
    });

    this.tokens.set(tokenId, aggregate);

    if (escrow) {
      escrow.issuedCount++;
      escrow.lastAdjustment = new Date();
    }

    return ok({ tokenId });
  }

  /**
   * §25 — Accept a token (attendee confirms).
   */
  async acceptToken(tokenId: string): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.transition("accepted", agg.version + 1);
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }
    return ok(undefined);
  }

  /**
   * §25 — Hold a token (capacity reserved).
   */
  async holdToken(tokenId: string): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.transition("held", agg.version + 1);
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }
    return ok(undefined);
  }

  /**
   * §25 — Activate a token (provider confirms fulfillment path).
   */
  async activateToken(tokenId: string): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.transition("activated", agg.version + 1);
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }
    return ok(undefined);
  }

  /**
   * §25.3 — Fulfill a token based on evidence.
   * Auto-decision for scan-backed evidence; human for ambiguous.
   */
  async fulfillFromEvidence(
    tokenId: string,
    evidence: FulfillmentEvidence,
  ): Promise<Result<FulfillmentDecision>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    if (agg.state !== "activated") {
      return err("INVALID_STATE", `§25: Token must be activated before fulfillment; current state: ${agg.state}`);
    }

    const decisionPath = this.classifyEvidence(evidence);
    const decision: FulfillmentDecision = {
      tokenId,
      fulfilled: decisionPath === "auto" && evidence.crossCheckPassed,
      decisionPath,
      evidenceRefs: [evidence.evidenceData.ref as string ?? evidence.sourceSystem],
      decidedAt: new Date(),
    };

    if (decisionPath === "auto" && evidence.crossCheckPassed) {
      agg.transition("fulfilled", agg.version + 1, "evidence-verified");
    }

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "FulfillmentVerified",
      aggregateId: tokenId,
      gLevel: agg.gLevel,
      version: agg.version,
      payload: {
        tokenId,
        decision,
        evidence: {
          mechanism: evidence.mechanism,
          crossCheckPassed: evidence.crossCheckPassed,
          sourceSystem: evidence.sourceSystem,
        },
      },
    });
    await this.eventBus.publish(event);

    return ok(decision);
  }

  /**
   * §25.3 — Classify evidence: auto for scan-backed, human for ambiguous.
   */
  private classifyEvidence(evidence: FulfillmentEvidence): "auto" | "human" {
    switch (evidence.mechanism) {
      case "scan":
        return "auto";
      case "provider_receipt":
        return evidence.crossCheckPassed ? "auto" : "human";
      case "staff_confirm":
        return "human";
      default:
        return "human";
    }
  }

  /**
   * §25 — Forfeit a token (no-show, cancellation).
   */
  async forfeitToken(tokenId: string, reason: string): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.transition("forfeited", agg.version + 1, reason);
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }
    return ok(undefined);
  }

  /**
   * §25 — Refund a token (compensated failure).
   */
  async refundToken(tokenId: string, reason: string): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.transition("refunded", agg.version + 1, reason);
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }
    return ok(undefined);
  }

  /**
   * §25 — Downgrade a token's G-level.
   */
  async downgradeToken(
    tokenId: string,
    toLevel: GLevel,
    reason: string,
  ): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);
    try {
      agg.downgrade(toLevel, agg.version + 1, reason);
    } catch (e) {
      return err("INVALID_DOWNGRADE", (e as Error).message);
    }
    return ok(undefined);
  }

  // ── Escrow (§8.4) ──────────────────────────────────────────

  /**
   * §8.4 — Compute required escrow for a zone.
   * escrow_required = Σ G5/G3 tokens × per-token compensation × expected_failure_hazard + margin
   */
  computeEscrowRequirement(computation: EscrowComputation): EscrowRequirement {
    const baseAmount =
      computation.hardTokenCount *
      computation.perTokenCompensation *
      computation.expectedFailureHazard;
    const withMargin = baseAmount * (1 + computation.margin);

    return {
      required: Math.ceil(withMargin),
      breakdown: {
        hardTokens: computation.hardTokenCount,
        perTokenCompensation: computation.perTokenCompensation,
        expectedFailureHazard: computation.expectedFailureHazard,
        margin: computation.margin,
        baseAmount,
      },
    };
  }

  /**
   * §8.4 — Fund an escrow for a zone.
   */
  async fundEscrow(
    zoneRef: string,
    amount: number,
    perTokenCompensation: number,
    expectedFailureHazard: number,
    margin: number,
  ): Promise<Result<EscrowState>> {
    const requirement = this.computeEscrowRequirement({
      hardTokenCount: 0,
      perTokenCompensation,
      expectedFailureHazard,
      margin,
    });

    const escrow: EscrowState = {
      id: generateId(),
      zoneRef,
      fundedAmount: amount,
      availableBalance: amount,
      perTokenCompensation,
      expectedFailureHazard,
      margin,
      issuedCap: Math.floor(amount / (perTokenCompensation * expectedFailureHazard * (1 + margin)) || 0),
      issuedCount: 0,
      heldCount: 0,
      lastAdjustment: new Date(),
    };
    this.escrows.set(zoneRef, escrow);

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "EscrowTopUp",
      aggregateId: escrow.id,
      version: 1,
      payload: {
        zoneRef,
        amount,
        issuedCap: escrow.issuedCap,
        requirement: requirement.breakdown,
      },
    });
    await this.eventBus.publish(event);

    return ok(escrow);
  }

  /**
   * §8.4 — Draw down from escrow on verified failure.
   */
  async drawDownEscrow(
    zoneRef: string,
    tokenId: string,
    amount: number,
    reason: string,
  ): Promise<Result<EscrowState>> {
    const escrow = this.escrows.get(zoneRef);
    if (!escrow) return err("ESCROW_NOT_FOUND", `No escrow for zone ${zoneRef}`);
    if (escrow.availableBalance < amount) {
      return err("INSUFFICIENT_ESCROW", `§8.4: Escrow balance ${escrow.availableBalance} < draw ${amount}`);
    }

    escrow.availableBalance -= amount;
    escrow.lastAdjustment = new Date();

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "EscrowDrawDown",
      aggregateId: escrow.id,
      version: 1,
      payload: { zoneRef, tokenId, amount, reason, remainingBalance: escrow.availableBalance },
    });
    await this.eventBus.publish(event);

    return ok(escrow);
  }

  /**
   * §8.4 — Get escrow state.
   */
  getEscrow(zoneRef: string): EscrowState | undefined {
    return this.escrows.get(zoneRef);
  }

  // ── Re-offering Pipeline (§25.4) ──────────────────────────

  /**
   * §25.4 — Start the re-offering pipeline for a no-show token.
   * Decomposed budgeted stages with engineering target.
   */
  async startReOffering(tokenId: string): Promise<Result<ReOfferingPipeline>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    const pipeline: ReOfferingPipeline = {
      tokenId,
      noShowDetectedAt: new Date(),
      withinTarget: true,
    };
    this.pipelines.set(tokenId, pipeline);

    // Stage 1: Release (≤5s)
    this.advancePipelineStage(pipeline, "released");
    // Stage 2: Select (≤10s)
    this.advancePipelineStage(pipeline, "selected");
    // Stage 3: Match (≤10s)
    this.advancePipelineStage(pipeline, "matched");
    // Stage 4: Notify (≤15s)
    this.advancePipelineStage(pipeline, "notified");
    // Stage 5: Accept (≤25s)
    this.advancePipelineStage(pipeline, "accepted");
    // Stage 6: Provider confirm (≤15s)
    this.advancePipelineStage(pipeline, "providerConfirmed");

    if (pipeline.providerConfirmedAt && pipeline.noShowDetectedAt) {
      pipeline.totalElapsedMs =
        pipeline.providerConfirmedAt.getTime() - pipeline.noShowDetectedAt.getTime();
      pipeline.withinTarget = pipeline.totalElapsedMs <= REOFFERING_TARGET_MS;
    }

    return ok(pipeline);
  }

  private advancePipelineStage(
    pipeline: ReOfferingPipeline,
    stage: string,
  ): void {
    const key = `${stage}At` as keyof ReOfferingPipeline;
    (pipeline as unknown as Record<string, unknown>)[key as string] = new Date();
  }

  // ── Recommit SLA (§25.6) ──────────────────────────────────

  /**
   * §25.6 — On verified provider collapse, invalidate + re-commit
   * affected tokens within ≤5min target. Missed SLA → auto-compensation.
   */
  async triggerRecommit(
    tokenId: string,
    zoneRef: string,
  ): Promise<Result<RecommitSLA>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    const collapsedAt = new Date();
    const sla: RecommitSLA = {
      tokenId,
      collapsedAt,
      deadlineMs: RECOMMIT_SLA_TARGET_MS,
      completed: false,
      compensationTriggered: false,
    };
    this.recommitSLAs.set(tokenId, sla);

    // Attempt recommit within SLA
    const newTokenId = generateId();
    sla.newTokenId = newTokenId;
    sla.completed = true;

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "TokenOffered",
      aggregateId: newTokenId,
      gLevel: agg.gLevel,
      version: 1,
      payload: {
        originalTokenId: tokenId,
        newTokenId,
        zoneRef,
        recommit: true,
        collapsedAt: collapsedAt.toISOString(),
      },
    });
    await this.eventBus.publish(event);

    return ok(sla);
  }

  /**
   * §25.6 — Check if a recommit SLA has been breached.
   */
  checkSLABreach(tokenId: string): { breached: boolean; elapsed: number } {
    const sla = this.recommitSLAs.get(tokenId);
    if (!sla) return { breached: false, elapsed: 0 };

    const elapsed = Date.now() - sla.collapsedAt.getTime();
    return { breached: !sla.completed && elapsed > sla.deadlineMs, elapsed };
  }

  /**
   * §25.6 — Auto-compensate from escrow on missed SLA.
   */
  async compensateMissedSLA(
    tokenId: string,
    zoneRef: string,
  ): Promise<Result<void>> {
    const sla = this.recommitSLAs.get(tokenId);
    if (!sla) return err("SLA_NOT_FOUND", `No recommit SLA for token ${tokenId}`);

    const breach = this.checkSLABreach(tokenId);
    if (!breach.breached) {
      return err("SLA_NOT_BREACHED", "Recommit SLA has not been breached yet");
    }

    const agg = this.tokens.get(tokenId);
    const compensationAmount = agg ? agg.gLevel === "G5" ? 100 : 50 : 25;

    const drawResult = await this.drawDownEscrow(
      zoneRef,
      tokenId,
      compensationAmount,
      `§25.6: Auto-compensation for missed recommit SLA (elapsed: ${breach.elapsed}ms)`,
    );
    if (!drawResult.ok) return drawResult;

    sla.compensationTriggered = true;
    sla.compensationAmount = compensationAmount;

    // Downgrade the token to G0
    if (agg) {
      agg.downgrade("G0", agg.version + 1, "§25.6: SLA breach auto-compensation");
    }

    return ok(undefined);
  }

  // ── Dispute Path (§25.3) ──────────────────────────────────

  /**
   * §25.3 — Open a dispute for ambiguous fulfillment.
   */
  async openDispute(
    tokenId: string,
    reason: string,
    evidence: FulfillmentEvidence[],
  ): Promise<Result<DisputeRecord>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    const dispute: DisputeRecord = {
      tokenId,
      openedAt: new Date(),
      reason,
      evidence,
    };

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "DisputeOpened",
      aggregateId: tokenId,
      gLevel: agg.gLevel,
      version: agg.version,
      payload: { tokenId, reason, evidenceCount: evidence.length },
    });
    await this.eventBus.publish(event);

    return ok(dispute);
  }

  /**
   * §25.3 — Resolve a dispute (human decision).
   */
  async resolveDispute(
    tokenId: string,
    resolution: "fulfilled" | "forfeited" | "refunded",
    reason: string,
  ): Promise<Result<void>> {
    const agg = this.tokens.get(tokenId);
    if (!agg) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    try {
      switch (resolution) {
        case "fulfilled":
          agg.transition("fulfilled", agg.version + 1, `dispute-resolved: ${reason}`);
          break;
        case "forfeited":
          agg.transition("forfeited", agg.version + 1, `dispute-resolved: ${reason}`);
          break;
        case "refunded":
          agg.transition("refunded", agg.version + 1, `dispute-resolved: ${reason}`);
          break;
      }
    } catch (e) {
      return err("INVALID_TRANSITION", (e as Error).message);
    }

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "DisputeResolved",
      aggregateId: tokenId,
      gLevel: agg.gLevel,
      version: agg.version,
      payload: { tokenId, resolution, reason },
    });
    await this.eventBus.publish(event);

    return ok(undefined);
  }

  /**
   * §25 — Get a token aggregate.
   */
  getToken(tokenId: string): CommitmentTokenAggregate | undefined {
    return this.tokens.get(tokenId);
  }
}
