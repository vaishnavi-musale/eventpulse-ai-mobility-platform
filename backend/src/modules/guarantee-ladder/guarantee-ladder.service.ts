// §6/§44 — Guarantee Ladder Manager service
// Deterministic G-level computation from weakest live link.
// Degradation is monotonic (G5→G3→G2→G1→G0); obligations contract to match.
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  GLevel,
  G_LADDER_ORDER,
  G_LADDER_INDEX,
  degradesGLevel,
  requiresVerifiedInventory,
} from "../../core/domain/g-level.enum";
import {
  OperatingMode,
  MODE_MAX_G_LEVEL,
} from "../../core/domain/operating-mode.enum";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { EVENT_NAMES } from "../../core/domain/events/event-names";
import { generateId } from "../../core/common/ids";
import {
  GComputeInput,
  GComputeResult,
  GLinkStatus,
  GLadderForbidCheck,
  GLadderForbidResult,
} from "./types";

@Injectable()
export class GuaranteeLadderService {
  private readonly logger = new Logger(GuaranteeLadderService.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §6.2 — Compute a token's G-level from the weakest live link.
   * Called at issuance AND every state transition.
   * The degrade chain is deterministic: starting from requested level,
   * walk down until all link requirements are met.
   */
  computeGLevel(input: GComputeInput): GComputeResult {
    const { requestedLevel, links } = input;
    const degradeChain: GLevel[] = [];

    // Walk from the requested level down the ladder until we find the
    // highest level whose link requirements are satisfied.
    let chosen: GLevel = "G0";
    for (const candidate of G_LADDER_ORDER) {
      if (!degradesGLevel(requestedLevel, candidate)) continue;

      if (this.linksSupportLevel(candidate, links)) {
        chosen = candidate;
        break;
      }
      degradeChain.push(candidate);
    }

    // If nothing matched (shouldn't happen since G0 is always valid), fallback.
    if (degradeChain.length === 0 && chosen === requestedLevel) {
      return {
        computedLevel: chosen,
        degradeChain: [],
        reason: `all links satisfied for ${requestedLevel}`,
      };
    }

    return {
      computedLevel: chosen,
      degradeChain,
      reason:
        degradeChain.length > 0
          ? `degraded from ${requestedLevel} via [${degradeChain.join("→")}] to ${chosen}: weakest link broke`
          : `computed ${requestedLevel} (all links satisfied)`,
    };
  }

  /**
   * §6.2 — Check if a specific link configuration supports a given G-level.
   * G5: inventory verified + escrow funded + channel up + NORMAL mode
   * G3: inventory verified + channel up (escrow not strictly required)
   * G2: channel up + mode allows (soft hold)
   * G1: mode allows (public channel induction)
   * G0: always valid (informed adrift)
   */
  private linksSupportLevel(level: GLevel, links: GLinkStatus): boolean {
    const modeMax = MODE_MAX_G_LEVEL[links.operatingMode] as GLevel;
    if (G_LADDER_INDEX[level] < G_LADDER_INDEX[modeMax]) {
      return false;
    }

    switch (level) {
      case "G5":
        return (
          links.inventoryVerified &&
          links.escrowFunded &&
          links.verificationChannelUp &&
          links.operatingMode === OperatingMode.NORMAL
        );
      case "G3":
        return links.inventoryVerified && links.verificationChannelUp;
      case "G2":
        return links.verificationChannelUp;
      case "G1":
        return true;
      case "G0":
        return true;
      default:
        return false;
    }
  }

  /**
   * §6 — Transition evaluation: given current token state + changed link,
   * compute new G-level. Emits TokenDowngraded if degradation occurs.
   */
  async evaluateTransition(
    tokenId: string,
    currentLevel: GLevel,
    links: GLinkStatus,
    previousVersion: number,
  ): Promise<GComputeResult> {
    const result = this.computeGLevel({
      requestedLevel: currentLevel,
      links,
    });

    if (degradesGLevel(currentLevel, result.computedLevel) &&
      result.computedLevel !== currentLevel) {
      this.logger.warn(
        `Token ${tokenId}: ${currentLevel} → ${result.computedLevel} (${result.reason})`,
      );

      const event = new EventPulseDomainEvent({
        id: generateId(),
        eventName: EVENT_NAMES.TokenDowngraded,
        aggregateId: tokenId,
        gLevel: result.computedLevel,
        version: previousVersion + 1,
        payload: {
          tokenId,
          fromLevel: currentLevel,
          toLevel: result.computedLevel,
          degradeChain: result.degradeChain,
          reason: result.reason,
          timestamp: new Date().toISOString(),
        },
      });
      await this.eventBus.publish(event);
    }

    return result;
  }

  /**
   * §6.3 — Enforce South G-Ladder forbid rules.
   * - No G5/G3 where inventory isn't verified
   * - No HARD token where delivery can't be confirmed by a channel
   * - No "guaranteed flow" where avg G ≤ G1
   * - No labeling G0 as managed
   */
  enforceForbids(check: GLadderForbidCheck): GLadderForbidResult {
    const { gLevel, inventoryVerified, channelConfirmable, avgGLevel, labeledAsManaged } = check;

    if ((gLevel === "G5" || gLevel === "G3") && !inventoryVerified) {
      return {
        allowed: false,
        violation: `§6.3: ${gLevel} requires verified inventory; inventory is not verified`,
      };
    }

    if ((gLevel === "G5" || gLevel === "G3") && !channelConfirmable) {
      return {
        allowed: false,
        violation: `§6.3: HARD token ${gLevel} requires confirmable delivery channel`,
      };
    }

    if ((gLevel === "G5" || gLevel === "G3") && avgGLevel <= G_LADDER_INDEX["G1"]) {
      return {
        allowed: false,
        violation: `§6.3: guaranteed flow requires avg G > G1; current avg is G≤G1`,
      };
    }

    if (gLevel === "G0" && labeledAsManaged) {
      return {
        allowed: false,
        violation: `§6.3: G0 tokens must not be labeled as managed`,
      };
    }

    return { allowed: true };
  }

  /**
   * §26.1 — Operating-mode coupling enforcement.
   * NORMAL: G5/G3/G2/G1 allowed
   * DEGRADED: HARD→SOFT downgrade, G≤2, no auto-incentives
   * EMERGENCY: all critical-path tokens→G0, emergency authority dominates
   * PLATFORM-DEGRADED: freeze new G≥2, honor held signed tokens
   */
  enforceModeCoupling(
    currentMode: OperatingMode,
    requestedLevel: GLevel,
  ): { allowed: boolean; maxGLevel: GLevel; reason: string } {
    const maxG = MODE_MAX_G_LEVEL[currentMode] as GLevel;
    const allowed = G_LADDER_INDEX[requestedLevel] >= G_LADDER_INDEX[maxG];

    return {
      allowed,
      maxGLevel: maxG,
      reason: allowed
        ? `${requestedLevel} is within ${currentMode} ceiling (${maxG})`
        : `${requestedLevel} exceeds ${currentMode} ceiling (${maxG}); must use ≤${maxG}`,
    };
  }

  /**
   * §6.2 — At issuance: compute the initial G-level for a new token,
   * enforcing forbids + mode coupling.
   */
  computeAtIssuance(
    requestedLevel: GLevel,
    links: GLinkStatus,
    avgGLevel: number,
    channelConfirmable: boolean,
  ): GComputeResult & { forbidResult: GLadderForbidResult } {
    const modeCheck = this.enforceModeCoupling(links.operatingMode, requestedLevel);
    const effectiveRequest = modeCheck.allowed
      ? requestedLevel
      : (MODE_MAX_G_LEVEL[links.operatingMode] as GLevel);

    const computeResult = this.computeGLevel({
      requestedLevel: effectiveRequest,
      links,
    });

    const forbidResult = this.enforceForbids({
      gLevel: computeResult.computedLevel,
      inventoryVerified: links.inventoryVerified,
      channelConfirmable,
      avgGLevel,
      labeledAsManaged: false,
    });

    return { ...computeResult, forbidResult };
  }
}
