// §25.5 — Saga outbox/intent event entity (Postgres source of truth)
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type SagaStep =
  | "INTENT_APPENDED"
  | "PG_DECREMENTED"
  | "LEDGER_ENTRIED"
  | "PUBLISHED"
  | "REDIS_CONFIRMED";

/**
 * §25.5 — The reservation-intent outbox row. Postgres is the source of truth.
 * The saga advances atomically; idempotency key guards every step.
 */
@Entity("reservation_intents")
@Index(["idempotencyKey"], { unique: true })
export class ReservationIntent {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid")
  reservationId: string;

  @Column("uuid")
  capacityUnitRef: string;

  @Column("int")
  quantity: number;

  /** G-grade requested (§6) */
  @Column()
  gLevel: string;

  @Column()
  idempotencyKey: string;

  /** Current saga step */
  @Column({ default: "INTENT_APPENDED" })
  step: SagaStep;

  /** Saga lifecycle flags */
  @Column({ default: false })
  decremented: boolean;

  @Column({ default: false })
  ledgerEntry: boolean;

  @Column({ default: false })
  published: boolean;

  @Column({ default: false })
  redisConfirmed: boolean;

  @Column({ default: false })
  completed: boolean;

  @Column({ nullable: true })
  redisConfirmKey?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
