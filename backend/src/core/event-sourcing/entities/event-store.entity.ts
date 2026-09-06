// §32/§27 — Event store stream + snapshot entities
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

/**
 * §32 — Persisted domain event stream (append-only).
 */
@Entity("event_stream")
@Index(["aggregateId", "version"], { unique: true })
export class EventStreamEntity {
  @PrimaryColumn("uuid")
  id: string;

  @Index()
  @Column("uuid")
  aggregateId: string;

  @Column("int")
  version: number;

  @Column()
  eventName: string;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @Column({ nullable: true })
  gLevel?: string;

  @CreateDateColumn()
  occurredAt: Date;
}

/**
 * §27 — Persisted aggregate snapshot to avoid full-replay dependency.
 */
@Entity("event_snapshot")
export class EventSnapshotEntity {
  @PrimaryColumn("uuid")
  aggregateId: string;

  @Column("int")
  version: number;

  @Column({ type: "jsonb" })
  state: Record<string, unknown>;

  @CreateDateColumn()
  snapshotAt: Date;
}
