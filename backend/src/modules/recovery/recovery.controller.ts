// §27 — Recovery & Resilience REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SignedOfflineTokenService } from "./signed-offline-token.service";
import { LastKnownPlanService } from "./last-known-plan.service";
import { SignedCredential } from "@core/resilience/signed-token";
import { GLevel } from "@core/domain/g-level.enum";
import { Channel } from "@core/domain/commitment-token";

@Controller("recovery")
export class RecoveryController {
  constructor(
    private readonly offline: SignedOfflineTokenService,
    private readonly lastKnownPlan: LastKnownPlanService,
  ) {}

  // ── Signed Offline Tokens (§27.1) ─────────────────────────

  @Post("offline-tokens")
  async issueOfflineToken(
    @Body()
    body: {
      tokenId: string;
      capacityUnitRef: string;
      attendeeRef: string;
      gLevel: GLevel;
      providerRef: string;
      secret: string;
      validityMs?: number;
    },
  ) {
    const r = await this.offline.issueOfflineToken(body);
    return r.ok
      ? { ok: true, token: r.value }
      : { ok: false, error: r.error };
  }

  @Post("offline-tokens/verify")
  verify(
    @Body() body: { credential: SignedCredential; secret: string },
  ) {
    return this.offline.verifyOfflineToken(body.credential, body.secret);
  }

  @Get("offline-tokens/:tokenId/validity")
  validity(@Param("tokenId") tokenId: string) {
    return this.offline.checkValidity(tokenId);
  }

  @Post("offline-tokens/:tokenId/release")
  async releaseExpired(@Param("tokenId") tokenId: string) {
    const r = await this.offline.releaseExpiredToken(tokenId);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Get("offline-tokens/cache/:tokenId")
  cache(@Param("tokenId") tokenId: string) {
    const entry = this.offline.getSignatureCache(tokenId);
    if (!entry) return { found: false };
    return {
      found: true,
      valid: this.offline.isSignatureCacheValid(tokenId),
      entry,
    };
  }

  @Get("offline-tokens/held/:providerRef")
  held(@Param("providerRef") providerRef: string) {
    return this.offline.getHeldTokens(providerRef);
  }

  @Get("offline-tokens/recovery-needed")
  recoveryNeeded() {
    return this.offline.getTokensForRecovery();
  }

  // ── Last-Known-Plan Broadcast (§27.3) ─────────────────────

  @Post("broadcast")
  async broadcast(
    @Body()
    body: {
      planId: string;
      channel: Channel;
      body: string;
      priority: "normal" | "high" | "critical";
      recipients: string[];
    },
  ) {
    const r = await this.lastKnownPlan.broadcast(
      body.planId,
      body.channel,
      body.body,
      body.priority,
      body.recipients,
    );
    return r.ok ? { ok: true, message: r.value } : { ok: false, error: r.error };
  }

  @Post("broadcast/deliver")
  recordDelivery(@Body() body: { messageId: string; recipientRef: string }) {
    this.lastKnownPlan.recordDelivery(body.messageId, body.recipientRef);
    return { recorded: true };
  }

  @Post("broadcast/ack")
  recordAck(@Body() body: { messageId: string; recipientRef: string }) {
    const r = this.lastKnownPlan.recordAck(body.messageId, body.recipientRef);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  @Get("broadcast/message/:messageId")
  message(@Param("messageId") messageId: string) {
    const m = this.lastKnownPlan.getMessage(messageId);
    return m ? { found: true, message: m } : { found: false };
  }

  @Post("broadcast/escalations")
  escalations() {
    return this.lastKnownPlan.checkEscalations();
  }
}
