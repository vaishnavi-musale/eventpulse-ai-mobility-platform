// §25 — Commitment & Delivery Engine REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CommitmentDeliveryService } from "./commitment-delivery.service";
import { CommitmentType, VerificationMechanism, Channel } from "@core/domain/commitment-token";
import { GLevel } from "@core/domain/g-level.enum";
import { FulfillmentEvidence } from "./types";

@Controller("commitment")
export class CommitmentDeliveryController {
  constructor(private readonly commitment: CommitmentDeliveryService) {}

  // ── Token Lifecycle (§25) ──────────────────────────────────

  @Post("tokens")
  async offerToken(
    @Body()
    body: {
      attendeeRef: string;
      category: CommitmentType;
      capacityUnitRef: string;
      gLevel: GLevel;
      channel: Channel;
      verificationMechanism: VerificationMechanism;
      incentiveValue: number;
      cost: number;
      expiresAt: string;
      timeWindowStart: string;
      timeWindowEnd: string;
      zoneRef: string;
    },
  ) {
    const result = await this.commitment.offerToken({
      attendeeRef: body.attendeeRef,
      category: body.category,
      capacityUnitRef: body.capacityUnitRef,
      gLevel: body.gLevel,
      channel: body.channel,
      verificationMechanism: body.verificationMechanism,
      incentiveValue: body.incentiveValue,
      cost: body.cost,
      expiresAt: new Date(body.expiresAt),
      timeWindowStart: new Date(body.timeWindowStart),
      timeWindowEnd: new Date(body.timeWindowEnd),
      zoneRef: body.zoneRef,
    });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, tokenId: result.value.tokenId };
  }

  @Post("tokens/:id/accept")
  async accept(@Param("id") id: string) {
    const r = await this.commitment.acceptToken(id);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/hold")
  async hold(@Param("id") id: string) {
    const r = await this.commitment.holdToken(id);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/activate")
  async activate(@Param("id") id: string) {
    const r = await this.commitment.activateToken(id);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/downgrade")
  async downgrade(
    @Param("id") id: string,
    @Body() body: { toLevel: GLevel; reason: string },
  ) {
    const r = await this.commitment.downgradeToken(id, body.toLevel, body.reason);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/forfeit")
  async forfeit(@Param("id") id: string, @Body() body: { reason: string }) {
    const r = await this.commitment.forfeitToken(id, body.reason);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/refund")
  async refund(@Param("id") id: string, @Body() body: { reason: string }) {
    const r = await this.commitment.refundToken(id, body.reason);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Get("tokens/:id")
  getToken(@Param("id") id: string) {
    const token = this.commitment.getToken(id);
    if (!token) return { found: false };
    return { found: true, token };
  }

  @Post("tokens/:id/fulfill")
  async fulfill(
    @Param("id") id: string,
    @Body() body: Omit<FulfillmentEvidence, "tokenId">,
  ) {
    const r = await this.commitment.fulfillFromEvidence(id, {
      ...body,
      tokenId: id,
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : new Date(),
    });
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, decision: r.value };
  }

  @Post("tokens/:id/reoffering")
  async startReOffering(@Param("id") id: string) {
    const r = await this.commitment.startReOffering(id);
    return r.ok ? { ok: true, pipeline: r.value } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/recommit")
  async triggerRecommit(
    @Param("id") id: string,
    @Body() body: { zoneRef: string },
  ) {
    const r = await this.commitment.triggerRecommit(id, body.zoneRef);
    return r.ok ? { ok: true, sla: r.value } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/compensate-sla")
  async compensateSLA(@Param("id") id: string, @Body() body: { zoneRef: string }) {
    const r = await this.commitment.compensateMissedSLA(id, body.zoneRef);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  // ── Dispute Path (§25.3) ──────────────────────────────────

  @Post("tokens/:id/disputes")
  async openDispute(
    @Param("id") id: string,
    @Body() body: { reason: string; evidence: FulfillmentEvidence[] },
  ) {
    const r = await this.commitment.openDispute(id, body.reason, body.evidence);
    return r.ok ? { ok: true, dispute: r.value } : { ok: false, error: r.error };
  }

  @Post("tokens/:id/disputes/resolve")
  async resolveDispute(
    @Param("id") id: string,
    @Body() body: { resolution: "fulfilled" | "forfeited" | "refunded"; reason: string },
  ) {
    const r = await this.commitment.resolveDispute(id, body.resolution, body.reason);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  // ── Escrow (§8.4) ──────────────────────────────────────────

  @Post("escrow/fund")
  async fundEscrow(
    @Body()
    body: {
      zoneRef: string;
      amount: number;
      perTokenCompensation: number;
      expectedFailureHazard: number;
      margin: number;
    },
  ) {
    const r = await this.commitment.fundEscrow(
      body.zoneRef,
      body.amount,
      body.perTokenCompensation,
      body.expectedFailureHazard,
      body.margin,
    );
    return r.ok ? { ok: true, escrow: r.value } : { ok: false, error: r.error };
  }

  @Get("escrow/:zoneRef")
  getEscrow(@Param("zoneRef") zoneRef: string) {
    const escrow = this.commitment.getEscrow(zoneRef);
    return escrow ? { found: true, escrow } : { found: false };
  }

  @Post("escrow/drawdown")
  async drawDown(@Body() body: { zoneRef: string; tokenId: string; amount: number; reason: string }) {
    const r = await this.commitment.drawDownEscrow(
      body.zoneRef,
      body.tokenId,
      body.amount,
      body.reason,
    );
    return r.ok ? { ok: true, escrow: r.value } : { ok: false, error: r.error };
  }

  @Post("escrow/requirement")
  computeRequirement(
    @Body()
    body: {
      hardTokenCount: number;
      perTokenCompensation: number;
      expectedFailureHazard: number;
      margin: number;
    },
  ) {
    return this.commitment.computeEscrowRequirement(body);
  }
}
