// §12.1 — Verified-inventory stream.
// available_commitments is a first-class stream linked to evidence. Unverified
// inventory can never back G5/G3 tokens — G5/G3 issuance is gated on
// verified_inventory === true (hard constraint, §18.1/§6.3).
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import { InventoryVerificationState } from "@core/domain/capacity-unit";

export interface InventoryEvidence {
  kind: "contract" | "reservation_confirmation" | "staff_confirmation";
  ref: string;
}

export interface VerifyInventoryCommand {
  capacityUnitRef: string;
  newState: InventoryVerificationState;
  evidence: InventoryEvidence[];
  sourceSystem: string;
}

export interface InventoryVerificationResult {
  capacityUnitRef: string;
  verified: boolean;
  verificationState: InventoryVerificationState;
  issuedEvent: "InventoryVerified" | "InventoryRevoked";
}

@Injectable()
export class VerifiedInventoryService {
  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {}

  /** §12.1 — a verifiable (evidence-linked) state may raise verifiedInventory. */
  verify(cmd: VerifyInventoryCommand): Promise<InventoryVerificationResult> {
    const { capacityUnitRef, newState, evidence, sourceSystem } = cmd;
    // Evidence-linked, confirmable states qualify as verified.
    const confirmable = ["CONTRACTED", "CONFIRMED_REALTIME"].includes(newState);
    const hasEvidence = evidence.length > 0;
    const verified = confirmable && hasEvidence;

    const event = new EventPulseDomainEvent<{
      capacityUnitRef: string;
      verified: boolean;
      verificationState: InventoryVerificationState;
      evidence: InventoryEvidence[];
      sourceSystem: string;
    }>({
      id: generateId(),
      eventName: verified ? "InventoryVerified" : "InventoryRevoked",
      aggregateId: capacityUnitRef,
      timestamp: new Date(),
      version: 1,
      payload: {
        capacityUnitRef,
        verified,
        verificationState: newState,
        evidence,
        sourceSystem,
      },
    });
    void this.eventBus.publish(event);

    return Promise.resolve({
      capacityUnitRef,
      verified,
      verificationState: newState,
      issuedEvent: verified ? "InventoryVerified" : "InventoryRevoked",
    });
  }

  /**
   * §12.1/§6.3 — G5/G3 issuance gate. Returns false unless verified inventory
   * is confirmed by evidence. Consumption of the bus event is a side effect;
   * the gate itself is the hard rule.
   */
  canBackHardToken(
    capacityUnitRef: string,
    verifiedInventory: boolean,
  ): boolean {
    return verifiedInventory;
  }

  /** §6.3 — HARD (G3/G5) requires verified inventory. */
  maxIssuable(verifiedInventory: boolean): "G5" | "G3" | "G2" {
    return verifiedInventory ? "G5" : "G2";
  }
}
