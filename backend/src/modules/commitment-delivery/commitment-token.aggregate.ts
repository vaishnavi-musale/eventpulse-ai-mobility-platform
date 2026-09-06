// §25 — Commitment Token aggregate root (event-sourced)
// Lifecycle: offered→accepted→held→activated→fulfilled|forfeited|refunded|downgraded
// Every transition is an EventStore/ledger event; replayable immutable ledger.
import { AggregateRoot } from "../../core/event-sourcing/aggregate-root";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import {
  GLevel,
  G_LADDER_INDEX,
  degradesGLevel,
} from "../../core/domain/g-level.enum";
import {
  CommitmentType,
  CommitmentState,
  Channel,
  VerificationMechanism,
} from "../../core/domain/commitment-token";

const VALID_TRANSITIONS: Record<CommitmentState, readonly CommitmentState[]> = {
  offered: ["accepted"],
  accepted: ["held"],
  held: ["activated", "downgraded"],
  activated: ["fulfilled", "forfeited", "refunded"],
  fulfilled: [],
  forfeited: [],
  refunded: [],
  downgraded: ["activated", "fulfilled", "forfeited"],
};

/**
 * §25 — Event-sourced commitment token aggregate.
 * §25.3: Evidence not truth — the ledger is the evidence trail.
 */
export class CommitmentTokenAggregate extends AggregateRoot {
  private _tokenId: string = "";
  private _attendeeRef: string = "";
  private _category: CommitmentType = "transit_slot";
  private _capacityUnitRef: string = "";
  private _gLevel: GLevel = "G1";
  private _state: CommitmentState = "offered";
  private _channel: Channel = "app";
  private _verificationMechanism: VerificationMechanism = "none";
  private _incentiveValue: number = 0;
  private _cost: number = 0;
  private _expiresAt: Date = new Date();
  private _timeWindowStart: Date = new Date();
  private _timeWindowEnd: Date = new Date();

  get tokenId(): string { return this._tokenId; }
  get gLevel(): GLevel { return this._gLevel; }
  get state(): CommitmentState { return this._state; }
  get attendeeRef(): string { return this._attendeeRef; }
  get category(): CommitmentType { return this._category; }
  get channel(): Channel { return this._channel; }

  /** §25 — Initialize a new token. */
  init(params: {
    tokenId: string;
    attendeeRef: string;
    category: CommitmentType;
    capacityUnitRef: string;
    gLevel: GLevel;
    channel: Channel;
    verificationMechanism: VerificationMechanism;
    incentiveValue: number;
    cost: number;
    expiresAt: Date;
    timeWindowStart: Date;
    timeWindowEnd: Date;
    version: number;
  }): void {
    this.apply(
      new EventPulseDomainEvent({
        id: params.tokenId,
        eventName: "TokenOffered",
        aggregateId: params.tokenId,
        gLevel: params.gLevel,
        version: params.version,
        payload: {
          tokenId: params.tokenId,
          attendeeRef: params.attendeeRef,
          category: params.category,
          capacityUnitRef: params.capacityUnitRef,
          gLevel: params.gLevel,
          channel: params.channel,
          verificationMechanism: params.verificationMechanism,
          incentiveValue: params.incentiveValue,
          cost: params.cost,
          expiresAt: params.expiresAt.toISOString(),
          timeWindowStart: params.timeWindowStart.toISOString(),
          timeWindowEnd: params.timeWindowEnd.toISOString(),
        },
      }),
    );
  }

  /** §25 — Transition state with validation. */
  transition(
    to: CommitmentState,
    version: number,
    reason: string = "",
  ): void {
    const valid = VALID_TRANSITIONS[this._state];
    if (!valid || !valid.includes(to)) {
      throw new Error(
        `§25: Invalid transition ${this._state}→${to} for token ${this._tokenId}`,
      );
    }

    const eventName = `Token${to.charAt(0).toUpperCase()}${to.slice(1)}` as
      | "TokenAccepted"
      | "TokenHeld"
      | "TokenActivated"
      | "TokenFulfilled"
      | "TokenForfeited"
      | "TokenRefunded"
      | "TokenDowngraded";

    this.apply(
      new EventPulseDomainEvent({
        id: `${this._tokenId}-${version}`,
        eventName,
        aggregateId: this._tokenId,
        gLevel: this._gLevel,
        version,
        payload: { tokenId: this._tokenId, from: this._state, to, reason },
      }),
    );
  }

  /** §6 — Downgrade G-level (monotonic downward). */
  downgrade(toLevel: GLevel, version: number, reason: string): void {
    if (!degradesGLevel(this._gLevel, toLevel)) {
      throw new Error(
        `§6: Cannot upgrade from ${this._gLevel} to ${toLevel}`,
      );
    }
    this.apply(
      new EventPulseDomainEvent({
        id: `${this._tokenId}-dg-${version}`,
        eventName: "TokenDowngraded",
        aggregateId: this._tokenId,
        gLevel: toLevel,
        version,
        payload: {
          tokenId: this._tokenId,
          fromLevel: this._gLevel,
          toLevel,
          reason,
        },
      }),
    );
  }

  /** §25 — Whether this token is a HARD commitment (G3/G5). */
  isHard(): boolean {
    return this._gLevel === "G5" || this._gLevel === "G3";
  }

  /** §25 — Whether the token is in an active (non-terminal) state. */
  isActive(): boolean {
    return !["fulfilled", "forfeited", "refunded"].includes(this._state);
  }

  // ── Event handlers (apply side) ──────────────────────────

  protected onTokenOffered(e: EventPulseDomainEvent): void {
    const p = e.payload as Record<string, unknown>;
    this._tokenId = p.tokenId as string;
    this._attendeeRef = p.attendeeRef as string;
    this._category = p.category as CommitmentType;
    this._capacityUnitRef = p.capacityUnitRef as string;
    this._gLevel = ((e.gLevel ?? p.gLevel) ?? "G1") as GLevel;
    this._state = "offered";
    this._channel = p.channel as Channel;
    this._verificationMechanism = p.verificationMechanism as VerificationMechanism;
    this._incentiveValue = p.incentiveValue as number;
    this._cost = p.cost as number;
    this._expiresAt = new Date(p.expiresAt as string);
    this._timeWindowStart = new Date(p.timeWindowStart as string);
    this._timeWindowEnd = new Date(p.timeWindowEnd as string);
  }

  protected onTokenAccepted(e: EventPulseDomainEvent): void {
    this._state = "accepted";
  }

  protected onTokenHeld(e: EventPulseDomainEvent): void {
    this._state = "held";
  }

  protected onTokenActivated(e: EventPulseDomainEvent): void {
    this._state = "activated";
  }

  protected onTokenFulfilled(e: EventPulseDomainEvent): void {
    this._state = "fulfilled";
  }

  protected onTokenForfeited(e: EventPulseDomainEvent): void {
    this._state = "forfeited";
  }

  protected onTokenRefunded(e: EventPulseDomainEvent): void {
    this._state = "refunded";
  }

  protected onTokenDowngraded(e: EventPulseDomainEvent): void {
    const p = e.payload as Record<string, unknown>;
    this._gLevel = (p.toLevel ?? e.gLevel) as GLevel;
    this._state = "downgraded";
  }
}
