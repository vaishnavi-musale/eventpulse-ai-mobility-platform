// §25 — Commitment read-model projection (CQRS read side).
// Subscribes to token lifecycle events from the EventBus and maintains an
// in-memory projection of per-token state + zone-level aggregates. Consumers
// are idempotent: they dedupe on event.id via a processed-set, so at-least-once
// delivery is safe. This is the queryable view used by ops and dashboards.
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { GLevel } from "@core/domain/g-level.enum";

export interface TokenProjectionRow {
  tokenId: string;
  attendeeRef: string;
  capacityUnitRef: string;
  zoneRef: string;
  category: string;
  state: string;
  gLevel: GLevel;
  updatedAt: Date;
}

export interface ZoneProjection {
  zoneRef: string;
  activeTokenCount: number;
  fulfilledTokenCount: number;
  forfeitedTokenCount: number;
  byState: Record<string, number>;
}

/** §25 — token lifecycle event names the projection tracks. */
const TOKEN_EVENTS = [
  "TokenOffered",
  "TokenAccepted",
  "TokenHeld",
  "TokenActivated",
  "TokenFulfilled",
  "TokenDowngraded",
  "TokenForfeited",
  "TokenRefunded",
  "FulfillmentVerified",
] as const;

@Injectable()
export class CommitmentProjectionConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommitmentProjectionConsumer.name);
  private readonly tokens = new Map<string, TokenProjectionRow>();
  private readonly zones = new Map<string, ZoneProjection>();
  private readonly processed = new Set<string>();
  private readonly unsubscribeFns: Array<() => void> = [];

  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {}

  onModuleInit(): void {
    for (const name of TOKEN_EVENTS) {
      this.unsubscribeFns.push(
        this.eventBus.subscribe(name, (event) =>
          this.handle(event as EventPulseDomainEvent<Record<string, unknown>>),
        ),
      );
    }
    void this.logger.log("§25: Commitment projection consumer subscribed");
  }

  onModuleDestroy(): void {
    for (const fn of this.unsubscribeFns) {
      fn();
    }
    this.unsubscribeFns.length = 0;
  }

  private async handle(event: EventPulseDomainEvent<Record<string, unknown>>): Promise<void> {
    if (this.processed.has(event.id)) return; // idempotent dedupe
    this.upsertFromEvent(event);
    this.processed.add(event.id);
  }

  /**
   * Normalize the differing payload schemas:
   *  - TokenOffered: tokenId, attendeeRef, category, capacityUnitRef, gLevel, ...
   *  - Token* transitions: tokenId, from, to, reason (optional level fields)
   *  - TokenDowngraded: tokenId, fromLevel, toLevel
   *  - FulfillmentVerified: tokenId, + state
   */
  private upsertFromEvent(event: EventPulseDomainEvent<Record<string, unknown>>): void {
    const p = (event.payload ?? {}) as Record<string, unknown>;
    const tokenId = String(p.tokenId ?? event.aggregateId ?? "");
    if (!tokenId) return;

    const row = this.tokens.get(tokenId) ?? {
      tokenId,
      attendeeRef: String(p.attendeeRef ?? ""),
      capacityUnitRef: String(p.capacityUnitRef ?? ""),
      zoneRef: String(p.zoneRef ?? ""),
      category: String(p.category ?? ""),
      state: "",
      gLevel: (p.gLevel ?? "G0") as GLevel,
      updatedAt: event.timestamp,
    };

    if (p.state) row.state = String(p.state);
    if (p.to) row.state = String(p.to);
    if (p.toLevel) row.state = "downgraded";
    if (event.eventName === "TokenOffered") row.state = "offered";
    if (event.eventName === "TokenFulfilled") row.state = "fulfilled";
    if (event.eventName === "TokenForfeited") row.state = "forfeited";
    if (event.eventName === "TokenRefunded") row.state = "refunded";
    if (event.eventName === "TokenHeld") row.state = "held";
    if (event.eventName === "TokenAccepted") row.state = "accepted";
    if (event.eventName === "TokenActivated") row.state = "activated";

    const prevState = this.tokens.get(tokenId)?.state ?? "offered";

    // carry context that isn't repeated on transition events
    if (tokenId === row.tokenId && this.tokens.get(tokenId)) {
      const prev = this.tokens.get(tokenId)!;
      row.attendeeRef = prev.attendeeRef;
      row.capacityUnitRef = prev.capacityUnitRef;
      row.zoneRef = prev.zoneRef;
      row.category = prev.category;
    }

    row.gLevel = (p.gLevel as GLevel) ?? (p.toLevel as GLevel) ?? row.gLevel;
    row.updatedAt = event.timestamp;

    this.tokens.set(tokenId, row);
    if (row.zoneRef) this.touchZone(row.zoneRef, row.state, prevState);
  }

  private touchZone(zoneRef: string, state: string, prevState: string): void {
    const z = this.zones.get(zoneRef) ?? {
      zoneRef,
      activeTokenCount: 0,
      fulfilledTokenCount: 0,
      forfeitedTokenCount: 0,
      byState: {},
    };
    const isActive = (s: string) =>
      ["offered", "accepted", "held", "activated", "downgraded"].includes(s);

    // move a token out of its previous bucket if it counted toward active
    if (isActive(prevState) && !isActive(state)) z.activeTokenCount = Math.max(0, z.activeTokenCount - 1);

    z.byState[state] = (z.byState[state] ?? 0) + 1;
    if (state === "fulfilled") z.fulfilledTokenCount++;
    if (state === "forfeited") z.forfeitedTokenCount++;
    if (isActive(state)) z.activeTokenCount++;
    this.zones.set(zoneRef, z);
  }

  getToken(tokenId: string): TokenProjectionRow | undefined {
    const r = this.tokens.get(tokenId);
    return r ? { ...r } : undefined;
  }

  getTokensByState(state: string): TokenProjectionRow[] {
    return Array.from(this.tokens.values())
      .filter((t) => t.state === state)
      .map((t) => ({ ...t }));
  }

  getZone(zoneRef: string): ZoneProjection | undefined {
    const z = this.zones.get(zoneRef);
    return z ? { ...z, byState: { ...z.byState } } : undefined;
  }

  getActiveTokens(): TokenProjectionRow[] {
    return Array.from(this.tokens.values())
      .filter((t) => ["offered", "accepted", "held", "activated", "downgraded"].includes(t.state))
      .map((t) => ({ ...t }));
  }
}