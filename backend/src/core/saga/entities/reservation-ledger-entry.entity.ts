// §25.5 — Reservation ledger entry entity (immutable evidence trail)
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";
import { GLevel } from "../../domain/g-level.enum";

export type LedgerAction =
  | "RESERVE"
  | "RELEASE"
  | "REFUND"
  | "DOWNGRADE"
  | "DETACH"
  | "FULFILLED"
  | "FORFEITED";

/**
 * §25.5 — Immutable reservation ledger. System evidence, not truth (§25.3).
 */
@Entity("reservation_ledger")
export class ReservationLedgerEntry {
  @PrimaryColumn("uuid")
  id: string;

  @Index()
  @Column("uuid")
  reservationId: string;

  @Index()
  @Column("uuid")
  capacityUnitRef: string;

  @Column()
  action: LedgerAction;

  @Column("int")
  quantity: number;

  @Column({ nullable: true })
  gLevel?: GLevel;

  @Column()
  idempotencyKey: string;

  /** Free-form evidence payload (§25.3) */
  @Column({ type: "jsonb", nullable: true })
  evidence?: Record<string, unknown>;

  @CreateDateColumn()
  recordedAt: Date;
}
