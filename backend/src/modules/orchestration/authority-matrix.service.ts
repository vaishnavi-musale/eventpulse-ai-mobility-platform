// §19.1 — Authority Matrix: ownership-conflict arbiter per zone.
// Named controller pre-registered; emergency = request-only, never perform.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { EVENT_NAMES } from "../../core/domain/events/event-names";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { AuthorityEntry, OverrideRequest, OverrideDecision } from "./types";

@Injectable()
export class AuthorityMatrixService {
  private readonly logger = new Logger(AuthorityMatrixService.name);

  /** Pre-registered authority entries per zone */
  private readonly authorities = new Map<string, AuthorityEntry[]>();

  /** Active overrides */
  private readonly activeOverrides = new Map<string, OverrideRequest & { overrideId: string; expiresAt: Date }>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §19.1 — Register an authority entry for a zone.
   */
  registerAuthority(entry: Omit<AuthorityEntry, "id">): AuthorityEntry {
    const full: AuthorityEntry = { ...entry, id: generateId() };
    const zone = this.authorities.get(entry.zoneRef) ?? [];
    zone.push(full);
    this.authorities.set(entry.zoneRef, zone);
    return full;
  }

  /**
   * §19.1 — Resolve ownership conflict: find the arbiter for a zone.
   */
  resolveArbiter(zoneRef: string): AuthorityEntry | undefined {
    const entries = this.authorities.get(zoneRef) ?? [];
    return entries.find(
      (e) => e.authorityType === "zone_arbiter" && e.expiresAt > new Date(),
    );
  }

  /**
   * §19.2 — Process a human override request.
   * Named role + auth (MFA prod / API-key+role MVP),
   * expiry window, mandatory audited reason code.
   * Safety bypass forbidden (§18.2 constraints hit first).
   */
  async requestOverride(request: OverrideRequest): Promise<OverrideDecision> {
    // §18.2 — Safety bypass is forbidden; safety constraints hit first
    if (request.bypassSafety) {
      this.logger.warn(
        `§18.2: Override with safety bypass rejected for ${request.requesterRole} in ${request.zoneRef}`,
      );
      const event = new EventPulseDomainEvent({
        id: generateId(),
        eventName: "SafetyConstraintBlocked",
        aggregateId: request.zoneRef,
        version: 1,
        payload: {
          requester: request.requesterRole,
          action: request.action,
          reason: "§18.2: Safety bypass forbidden",
        },
      });
      await this.eventBus.publish(event);

      return {
        granted: false,
        reason: "§18.2: Safety bypass is forbidden; safety constraints must be satisfied first",
        rejectionReason: "SAFETY_BYPASS_FORBIDDEN",
      };
    }

    // Check for conflicting active override
    const conflictKey = `${request.zoneRef}:${request.action}`;
    for (const [, existing] of this.activeOverrides) {
      if (
        existing.zoneRef === request.zoneRef &&
        existing.action === request.action &&
        existing.expiresAt > new Date()
      ) {
        return {
          granted: false,
          reason: `Conflicting override active from ${existing.requesterRole}`,
          rejectionReason: `CONFLICTING_OVERRIDE: active override by ${existing.requesterRole}`,
        };
      }
    }

    // §19.2 — Validate mandatory reason code
    if (!request.reasonCode || request.reasonCode.trim().length === 0) {
      return {
        granted: false,
        reason: "§19.2: Mandatory reason code required",
        rejectionReason: "MISSING_REASON_CODE",
      };
    }

    // Grant the override
    const overrideId = generateId();
    const expiresAt = new Date(Date.now() + request.expiryMs);

    this.activeOverrides.set(overrideId, {
      ...request,
      overrideId,
      expiresAt,
    });

    const event = new EventPulseDomainEvent({
      id: overrideId,
      eventName: "OverrideGranted",
      aggregateId: request.zoneRef,
      version: 1,
      payload: {
        overrideId,
        requester: request.requesterRole,
        action: request.action,
        zoneRef: request.zoneRef,
        reasonCode: request.reasonCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
    await this.eventBus.publish(event);

    this.logger.log(
      `§19.2: Override granted: ${request.requesterRole} → ${request.action} in ${request.zoneRef} (expires ${expiresAt.toISOString()})`,
    );

    return {
      granted: true,
      overrideId,
      expiresAt,
      reason: `Override granted: ${request.reasonCode}`,
    };
  }

  /**
   * §19.2 — Expire an override.
   */
  async expireOverride(overrideId: string): Promise<void> {
    const override = this.activeOverrides.get(overrideId);
    if (override) {
      this.activeOverrides.delete(overrideId);
      const event = new EventPulseDomainEvent({
        id: generateId(),
        eventName: "OverrideExpired",
        aggregateId: override.zoneRef,
        version: 1,
        payload: { overrideId, expiredAt: new Date().toISOString() },
      });
      await this.eventBus.publish(event);
    }
  }

  /**
   * §19.1 — Emergency authority: request-only, never perform.
   */
  emergencyRequest(
    zoneRef: string,
    action: string,
    reason: string,
  ): { allowed: boolean; reason: string } {
    // Emergency authority can request but never perform
    return {
      allowed: true,
      reason: `§19.1: Emergency request for "${action}" in ${zoneRef}: ${reason} (request-only, never perform)`,
    };
  }

  /**
   * §19.2 — Check if an override is currently active for a zone+action.
   */
  isOverrideActive(zoneRef: string, action: string): boolean {
    for (const [, override] of this.activeOverrides) {
      if (
        override.zoneRef === zoneRef &&
        override.action === action &&
        override.expiresAt > new Date()
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all active overrides for a zone.
   */
  getActiveOverrides(zoneRef: string): Array<OverrideRequest & { overrideId: string; expiresAt: Date }> {
    const result: Array<OverrideRequest & { overrideId: string; expiresAt: Date }> = [];
    for (const [, override] of this.activeOverrides) {
      if (override.zoneRef === zoneRef && override.expiresAt > new Date()) {
        result.push(override);
      }
    }
    return result;
  }
}
