// §19/§21/§22 — Action Orchestration service (L7)
// Composes authority matrix, channel dispatch, and replanning.
import { Injectable } from "@nestjs/common";
import { AuthorityMatrixService } from "./authority-matrix.service";
import { ChannelDispatchService } from "./channel-dispatch.service";
import { ReplanningService } from "./replanning.service";
import { AuthorityEntry, OverrideRequest, OverrideDecision, ChannelDispatchRequest, ChannelDispatchResult, DeviationMeasurement } from "./types";
import { Result } from "../../core/common/result";
import { Channel } from "../../core/domain/commitment-token";

@Injectable()
export class OrchestrationService {
  constructor(
    readonly authorityMatrix: AuthorityMatrixService,
    readonly channelDispatch: ChannelDispatchService,
    readonly replanning: ReplanningService,
  ) {}

  // ── Authority (§19) ──────────────────────────────────────

  registerAuthority(entry: Omit<AuthorityEntry, "id">): AuthorityEntry {
    return this.authorityMatrix.registerAuthority(entry);
  }

  resolveArbiter(zoneRef: string): AuthorityEntry | undefined {
    return this.authorityMatrix.resolveArbiter(zoneRef);
  }

  async requestOverride(request: OverrideRequest): Promise<OverrideDecision> {
    return this.authorityMatrix.requestOverride(request);
  }

  async expireOverride(overrideId: string): Promise<void> {
    return this.authorityMatrix.expireOverride(overrideId);
  }

  emergencyRequest(
    zoneRef: string,
    action: string,
    reason: string,
  ): { allowed: boolean; reason: string } {
    return this.authorityMatrix.emergencyRequest(zoneRef, action, reason);
  }

  isOverrideActive(zoneRef: string, action: string): boolean {
    return this.authorityMatrix.isOverrideActive(zoneRef, action);
  }

  // ── Channel Dispatch (§22) ───────────────────────────────

  async dispatch(request: ChannelDispatchRequest): Promise<Result<ChannelDispatchResult>> {
    return this.channelDispatch.dispatch(request);
  }

  recordAck(deliveryId: string, channel: Channel): void {
    this.channelDispatch.recordAck(deliveryId, channel);
  }

  getChannelMetrics(channel: Channel) {
    return this.channelDispatch.getMetrics(channel);
  }

  computeReachableFraction() {
    return this.channelDispatch.computeReachableFraction();
  }

  // ── Replanning (§21.4) ──────────────────────────────────

  evaluateDeviation(zoneRef: string, measurement: DeviationMeasurement): DeviationMeasurement {
    return this.replanning.evaluateDeviation(zoneRef, measurement);
  }

  async processReplanDecision(
    zoneRef: string,
    measurement: DeviationMeasurement,
  ): Promise<{ replanned: boolean; reason: string }> {
    return this.replanning.processReplanDecision(zoneRef, measurement);
  }
}
