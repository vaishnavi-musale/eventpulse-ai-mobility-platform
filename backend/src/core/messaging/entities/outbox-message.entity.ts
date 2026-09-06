// §35 — Outbox message entity for at-least-once publishing persistence.
// If the transport is down, pending outbox rows are drained on recovery.
import { Column, Entity, Index, PrimaryColumn } from "typeorm";

export type OutboxState = "PENDING" | "PUBLISHED" | "FAILED";

/**
 * §35 — Persistent outbox for the EventBus publish side.
 * Guarantees at-least-once publish across process restarts / transport downtime.
 */
@Entity("event_outbox")
export class OutboxMessage {
  @PrimaryColumn("uuid")
  id: string;

  @Column()
  eventName: string;

  @Column()
  aggregateId: string;

  @Column({ type: "jsonb" })
  eventPayload: Record<string, unknown>;

  @Index()
  @Column({ default: "PENDING" })
  state: OutboxState;

  @Column({ nullable: true })
  idempotencyKey?: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: "timestamptz" })
  createdAt: Date;

  @Column({ nullable: true })
  publishedAt?: Date;
}
