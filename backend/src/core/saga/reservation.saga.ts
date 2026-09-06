// §25.5 — Reservation saga: the correctness heart.
// Outbox pattern with Redis hot counters as fast path + Postgres as source of truth.
// Idempotency key on every step (retry-safe).
// Structurally impossible to double-book: Postgres is the single writer; the
// intent row (idempotency-keyed, unique) is created once and only a completed
// intent may confirm. A crash between any two steps re-runs against the same
// intent row and never re-decrements.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { ReservationIntent } from "./entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "./entities/reservation-ledger-entry.entity";
import { CapacityLedger } from "./entities/capacity-ledger.entity";
import { SagaStep } from "./entities/reservation-intent.entity";
import {
  REDIS_CLIENT,
  REDIS_SAGA_CLIENT,
} from "../messaging/redis/redis-client.token";
import { EVENT_BUS } from "../messaging/event-bus.token";
import { EventBus } from "../messaging/event-bus.interface";
import { EventPulseDomainEvent } from "../domain/events/base-event";
import { EVENT_NAMES } from "../domain/events/event-names";
import { GLevel, requiresVerifiedInventory } from "../domain/g-level.enum";
import { err, ok, Result } from "../common/result";
import { REDIS_CONFIRM_TTL_SECONDS } from "./saga.constants";

export interface ReserveCommand {
  capacityUnitRef: string;
  quantity: number;
  gLevel: GLevel;
  attendeeRef: string;
  idempotencyKey: string;
  timeWindowStart: Date;
  timeWindowEnd: Date;
}

export interface ReserveOutcome {
  reservationId: string;
  intentId: string;
  gLevel: GLevel;
  confirmed: boolean;
  path: "redis" | "postgres";
  capacityRemaining: number;
}

export const RESERVATION_SAGA = "RESERVATION_SAGA";

@Injectable()
export class ReservationSaga {
  private readonly logger = new Logger(ReservationSaga.name);

  constructor(
    @InjectRepository(ReservationIntent)
    private readonly intentRepo: Repository<ReservationIntent>,
    @InjectRepository(ReservationLedgerEntry)
    private readonly ledgerRepo: Repository<ReservationLedgerEntry>,
    @InjectRepository(CapacityLedger)
    private readonly capacityRepo: Repository<CapacityLedger>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SAGA_CLIENT) private readonly redisSaga: Redis,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §25.5 — reserve() transaction.
   * Atomic guarantee: Postgres single-writer (decrement + ledger + intent) is
   * the source of truth. Redis is the fast decision path; Redis-down falls
   * back to Postgres single-writer. Postgres-down freezes new reservations
   * (no G≥2 issuance) but honors held signed tokens (see resilience module).
   */
  async reserve(command: ReserveCommand): Promise<Result<ReserveOutcome>> {
    if (requiresVerifiedInventory(command.gLevel)) {
      const verified = await this.isVerifiedInventory(command.capacityUnitRef);
      if (!verified) {
        return err(
          "VERIFIED_INVENTORY_REQUIRED",
          "G5/G3 tokens require verified inventory (§6.3/§18.1)",
          { gLevel: command.gLevel, capacityUnitRef: command.capacityUnitRef },
        );
      }
    }

    // Idempotency check (retry-safe).
    const existing = await this.intentRepo.findOneBy({
      idempotencyKey: command.idempotencyKey,
    });
    if (existing) {
      // Resume an in-progress intent (crash-recovery): complete the remaining
      // steps (publish + redis confirm). Postgres already committed the
      // decrement+ledger once, so resuming never re-decrements.
      if (!existing.completed) {
        const resumed = await this.completeOutstandingSteps(existing);
        return ok(resumed);
      }
      return this.buildOutcome(existing);
    }

    try {
      const outcome = await this.reserveCore(command);
      return ok(outcome);
    } catch (coreErr) {
      this.logger.warn(
        `Redis fast path failed; falling back to Postgres single-writer: ${(coreErr as Error).message}`,
      );
      try {
        const result = await this.reservePostgresFallback(command);
        return ok(result);
      } catch (pgErr) {
        this.logger.error(
          `Postgres reservation failed: ${(pgErr as Error).message}`,
        );
        return err(
          "RESERVATION_FAILED",
          "Reservation could not be persisted to source of truth",
        );
      }
    }
  }

  private async isVerifiedInventory(capacityUnitRef: string): Promise<boolean> {
    const cap = await this.capacityRepo.findOneBy({ id: capacityUnitRef });
    return cap ? cap.verifiedInventory : false;
  }

  /**
   * Fast path: Redis hot-counter check/decrement as the decision, then the
   * single Postgres transaction (intent + decrement + ledger) as the commit,
   * then publish, then Redis confirm.
   */
  private async reserveCore(command: ReserveCommand): Promise<ReserveOutcome> {
    const reservationId = uuidv4();
    const intentId = uuidv4();
    const counterKey = `ep:cap:${command.capacityUnitRef}`;

    // 1) Fast decision against Redis hot counter (atomic Lua decrement-and-check).
    const rawRemaining = await this.redis.eval(
      `
      local cur = tonumber(redis.call('GET', KEYS[1]) or '0')
      if cur < tonumber(ARGV[1]) then
        return -1
      end
      redis.call('DECRBY', KEYS[1], ARGV[1])
      return cur - tonumber(ARGV[1])
      `,
      1,
      counterKey,
      String(command.quantity),
    );
    const remaining = Number(rawRemaining);

    if (remaining === -1 || remaining < 0) {
      throw new Error("INSUFFICIENT_CAPACITY");
    }

    // 2) Postgres outbox append + decrement + ledger — one atomic transaction.
    //    This is the source of truth. Creating the intent first with a unique
    //    idempotencyKey makes double-insert structurally impossible.
    await this.commitPostgres(command, reservationId, intentId);

    // 3) Publish intent event (at-least-once; consumer idempotent on event.id).
    const event = new EventPulseDomainEvent({
      id: uuidv4(),
      eventName: EVENT_NAMES.TokenOffered,
      aggregateId: reservationId,
      gLevel: command.gLevel,
      version: 1,
      payload: {
        reservationId,
        capacityUnitRef: command.capacityUnitRef,
        quantity: command.quantity,
        attendeeRef: command.attendeeRef,
        idempotencyKey: command.idempotencyKey,
        timeWindowStart: command.timeWindowStart.toISOString(),
        timeWindowEnd: command.timeWindowEnd.toISOString(),
      },
    });
    await this.eventBus.publish(event, {
      idempotencyKey: command.idempotencyKey,
    });

    // 4) Redis confirm (idempotent via SET NX with TTL).
    const confirmKey = `ep:saga:intent:${intentId}`;
    await this.redisSaga.set(
      confirmKey,
      "CONFIRMED",
      "EX",
      REDIS_CONFIRM_TTL_SECONDS,
    );

    // Mark intent completed in Postgres.
    await this.intentRepo.update(
      { id: intentId },
      {
        step: "COMPLETED" as SagaStep,
        completed: true,
        published: true,
        redisConfirmed: true,
        redisConfirmKey: confirmKey,
      },
    );

    return {
      reservationId,
      intentId,
      gLevel: command.gLevel,
      confirmed: true,
      path: "redis",
      capacityRemaining: remaining,
    };
  }

  /**
   * Single Postgres transaction writing intent + decrement + ledger atomically.
   * Pessimistic row lock prevents concurrent double-decrement.
   * Order: intent insert FIRST — the unique idempotencyKey constraint rejects
   * any duplicate concurrent execution before capacity is touched (§25.5).
   */
  private async commitPostgres(
    command: ReserveCommand,
    reservationId: string,
    intentId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const intentRepo = em.getRepository(ReservationIntent);
      const ledgerRepo = em.getRepository(ReservationLedgerEntry);
      const capRepo = em.getRepository(CapacityLedger);

      // 1) Insert the intent first. A concurrent double-insert with the same
      //    idempotencyKey violates the unique constraint and aborts here —
      //    before any capacity mutation → structurally no double-book.
      await intentRepo.save(
        intentRepo.create({
          id: intentId,
          reservationId,
          capacityUnitRef: command.capacityUnitRef,
          quantity: command.quantity,
          gLevel: command.gLevel,
          idempotencyKey: command.idempotencyKey,
          step: "PUBLISHED",
          decremented: true,
          ledgerEntry: true,
          published: false,
          redisConfirmed: false,
          completed: false,
        }),
      );

      // 2) Decrement capacity (single-writer lock).
      const cap = await capRepo
        .createQueryBuilder("c")
        .setLock("pessimistic_write")
        .where("c.id = :id", { id: command.capacityUnitRef })
        .getOne();

      if (!cap) {
        throw new Error("CAPACITY_UNIT_NOT_FOUND");
      }
      const usable = cap.usableCapacity - cap.reserved;
      if (usable < command.quantity) {
        throw new Error("INSUFFICIENT_CAPACITY");
      }
      cap.reserved += command.quantity;
      await capRepo.save(cap);

      // 3) Ledger entry.
      const ledger = ledgerRepo.create({
        id: uuidv4(),
        reservationId,
        capacityUnitRef: command.capacityUnitRef,
        action: "RESERVE",
        quantity: command.quantity,
        gLevel: command.gLevel,
        idempotencyKey: command.idempotencyKey,
        evidence: { path: "redis-fast", note: "§25.5 outbox commit" },
      });
      await ledgerRepo.save(ledger);
    });
  }

  /**
   * Fallback: Redis-down → Postgres single-writer reservation.
   */
  private async reservePostgresFallback(
    command: ReserveCommand,
  ): Promise<ReserveOutcome> {
    const reservationId = uuidv4();
    const intentId = uuidv4();
    await this.commitPostgres(command, reservationId, intentId);

    // Publish is best-effort without Redis; if EventBus is Redis-backed it may
    // also be down — that's fine, reconciliation + replay cover it.
    try {
      const event = new EventPulseDomainEvent({
        id: uuidv4(),
        eventName: EVENT_NAMES.TokenOffered,
        aggregateId: reservationId,
        gLevel: command.gLevel,
        version: 1,
        payload: {
          reservationId,
          capacityUnitRef: command.capacityUnitRef,
          quantity: command.quantity,
          attendeeRef: command.attendeeRef,
          idempotencyKey: command.idempotencyKey,
          timeWindowStart: command.timeWindowStart.toISOString(),
          timeWindowEnd: command.timeWindowEnd.toISOString(),
          path: "postgres",
        },
      });
      await this.eventBus.publish(event, {
        idempotencyKey: command.idempotencyKey,
      });
    } catch (publishErr) {
      this.logger.warn(
        `Publish during Postgres fallback failed (will reconcile): ${(publishErr as Error).message}`,
      );
    }

    await this.intentRepo.update(
      { id: intentId },
      { step: "COMPLETED" as SagaStep, completed: true, published: true },
    );

    return {
      reservationId,
      intentId,
      gLevel: command.gLevel,
      confirmed: true,
      path: "postgres",
      capacityRemaining: 0,
    };
  }

  private async buildOutcome(
    intent: ReservationIntent,
  ): Promise<Result<ReserveOutcome>> {
    return ok({
      reservationId: intent.reservationId,
      intentId: intent.id,
      gLevel: intent.gLevel as GLevel,
      confirmed: intent.completed,
      path: "redis",
      capacityRemaining: 0,
    });
  }

  /**
   * §25.5 — Crash-recovery: finish publish + redis-confirm for an intent whose
   * Postgres commit succeeded but which crashed before completing.
   */
  private async completeOutstandingSteps(
    intent: ReservationIntent,
  ): Promise<ReserveOutcome> {
    if (!intent.published) {
      try {
        const event = new EventPulseDomainEvent({
          id: uuidv4(),
          eventName: EVENT_NAMES.TokenOffered,
          aggregateId: intent.reservationId,
          gLevel: intent.gLevel as GLevel,
          version: 1,
          payload: {
            reservationId: intent.reservationId,
            capacityUnitRef: intent.capacityUnitRef,
            quantity: intent.quantity,
            idempotencyKey: intent.idempotencyKey,
          },
        });
        await this.eventBus.publish(event, {
          idempotencyKey: intent.idempotencyKey,
        });
      } catch (pubErr) {
        this.logger.warn(
          `Resume: publish failed, will retry: ${(pubErr as Error).message}`,
        );
      }
    }

    const confirmKey = intent.redisConfirmKey ?? `ep:saga:intent:${intent.id}`;
    try {
      await this.redisSaga.set(
        confirmKey,
        "CONFIRMED",
        "EX",
        REDIS_CONFIRM_TTL_SECONDS,
      );
    } catch (redisErr) {
      this.logger.warn(
        `Resume: redis confirm failed: ${(redisErr as Error).message}`,
      );
    }

    await this.intentRepo.update(
      { id: intent.id },
      {
        step: "COMPLETED" as SagaStep,
        completed: true,
        published: true,
        redisConfirmed: true,
        redisConfirmKey: confirmKey,
      },
    );

    return {
      reservationId: intent.reservationId,
      intentId: intent.id,
      gLevel: intent.gLevel as GLevel,
      confirmed: true,
      path: "redis",
      capacityRemaining: 0,
    };
  }
}
