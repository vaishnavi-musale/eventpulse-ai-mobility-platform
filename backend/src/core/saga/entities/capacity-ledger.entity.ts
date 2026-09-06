// §25.5 — CapacityUnit (for saga decrements) as a TypeORM entity.
// NOTE: The full domain CapacityUnit lives in src/core/domain/capacity-unit.ts.
// Here we store the minimal persisted counters the saga needs.
import { Column, Entity, Index, PrimaryColumn, VersionColumn } from "typeorm";

/**
 * §25.5 — Persisted capacity counter backing Redis hot counters.
 * The saga decrements this atomically (single-writer) as source of truth.
 */
@Entity("capacity_ledger")
export class CapacityLedger {
  @PrimaryColumn("uuid")
  id: string;

  @Index()
  @Column()
  resourceType: string;

  @Column("int")
  usableCapacity: number;

  @Column("int", { default: 0 })
  reserved: number;

  @Column("int", { default: 0 })
  availableCommitments: number;

  @Column({ default: true })
  verifiedInventory: boolean;

  @VersionColumn()
  version: number;
}
