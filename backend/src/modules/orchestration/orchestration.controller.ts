// §19/§21/§22 — L7 Action Orchestration REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { OrchestrationService } from "./orchestration.service";
import { Channel } from "@core/domain/commitment-token";

@Controller("orchestration")
export class OrchestrationController {
  constructor(private readonly orchestration: OrchestrationService) {}

  // ── Authority (§19) ──────────────────────────────────────

  @Post("authorities")
  registerAuthority(
    @Body()
    body: {
      zoneRef: string;
      controllerName: string;
      authorityType: "zone_arbiter" | "emergency" | "platform";
      allowedScopes: string[];
      canBypassSafety: boolean;
      expiresAt: string;
    },
  ) {
    return this.orchestration.registerAuthority({
      zoneRef: body.zoneRef,
      controllerName: body.controllerName,
      authorityType: body.authorityType,
      allowedScopes: body.allowedScopes,
      canBypassSafety: body.canBypassSafety,
      expiresAt: new Date(body.expiresAt),
    });
  }

  @Get("authorities/arbiter/:zone")
  resolveArbiter(@Param("zone") zone: string) {
    return this.orchestration.resolveArbiter(zone);
  }

  @Post("overrides/request")
  async requestOverride(
    @Body()
    body: {
      requesterRole: string;
      authEvidence: string;
      zoneRef: string;
      action: string;
      reasonCode: string;
      reasonDetail: string;
      expiryMs: number;
      bypassSafety: boolean;
    },
  ) {
    const decision = await this.orchestration.requestOverride(body);
    if (!decision.granted) {
      return { granted: false, reason: decision.reason, rejectionReason: decision.rejectionReason };
    }
    return decision;
  }

  @Post("overrides/expire")
  async expireOverride(@Body() body: { overrideId: string }) {
    await this.orchestration.expireOverride(body.overrideId);
    return { expired: true };
  }

  @Post("emergency/request")
  emergencyRequest(
    @Body() body: { zoneRef: string; action: string; reason: string },
  ) {
    return this.orchestration.emergencyRequest(
      body.zoneRef,
      body.action,
      body.reason,
    );
  }

  // ── Channel Dispatch (§22) ───────────────────────────────

  @Post("dispatch")
  async dispatch(
    @Body()
    body: {
      channel: Channel;
      recipientRef: string;
      message: string;
      isHardToken: boolean;
      confirmable: boolean;
      priority: "normal" | "high" | "critical";
    },
  ) {
    const result = await this.orchestration.dispatch(body);
    if (!result.ok) {
      return { dispatched: false, error: result.error };
    }
    return result.value;
  }

  @Post("dispatch/ack")
  recordAck(@Body() body: { deliveryId: string; channel: Channel }) {
    this.orchestration.recordAck(body.deliveryId, body.channel);
    return { acked: true };
  }

  @Get("channel-metrics/:channel")
  channelMetrics(@Param("channel") channel: string) {
    return this.orchestration.getChannelMetrics(channel as Channel);
  }

  @Get("reachable-fraction")
  reachableFraction() {
    return this.orchestration.computeReachableFraction();
  }

  // ── Replanning (§21.4) ──────────────────────────────────

  @Post("replan/evaluate")
  evaluateDeviation(
    @Body()
    body: {
      zoneRef: string;
      currentDeviation: number;
      replanThreshold: number;
      timeToDanger: number;
      dynamicsScore: number;
      replanTriggered: boolean;
    },
  ) {
    return this.orchestration.evaluateDeviation(body.zoneRef, body);
  }

  @Post("replan/process")
  async processReplan(
    @Body()
    body: {
      zoneRef: string;
      currentDeviation: number;
      replanThreshold: number;
      timeToDanger: number;
      dynamicsScore: number;
      replanTriggered: boolean;
    },
  ) {
    return this.orchestration.processReplanDecision(body.zoneRef, body);
  }
}
