// §25.5 — Reconciliation job: counter-vs-ledger drift → refund/detach suspicious tokens + alert.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Redis from "ioredis";
import { ReservationIntent } from "../saga/entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "../saga/entities/reservation-ledger-entry.entity";
import { CapacityLedger } from "../saga/entities/capacity-ledger.entity";
import { REDIS_CLIENT } from "../messaging/redis/redis-client.token";
import { generateId } from "../common/ids";
import { GLevel } from "../domain/g-level.enum";

export interface ReconciliationReport {
  scannedIntents: number;
  drifted: number;
  refunded: number;
  detached: number;
  alerts: string[];
}

/**
 * §25.5 — Periodic counter-vs-ledger reconciliation.
 * Drift → refund/detach suspicious tokens and alert ops.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReservationIntent)
    private readonly intentRepo: Repository<ReservationIntent>,
    @InjectRepository(ReservationLedgerEntry)
    private readonly ledgerRepo: Repository<ReservationLedgerEntry>,
    @InjectRepository(CapacityLedger)
    private readonly capacityRepo: Repository<CapacityLedger>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async run(alertSink?: (msg: string) => void): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      scannedIntents: 0,
      drifted: 0,
      refunded: 0,
      detached: 0,
      alerts: [],
    };
    const emit = (msg: string) => {
      report.alerts.push(msg);
      alertSink?.(msg);
      this.logger.warn(`[Reconciliation] ${msg}`);
    };

    const intents = await this.intentRepo.find({ where: { completed: true } });
    report.scannedIntents = intents.length;

    await this.dataSource.transaction(async (em) => {
      for (const intent of intents) {
        const cap = await em
          .getRepository(CapacityLedger)
          .findOneBy({ id: intent.capacityUnitRef });

        // Redis confirm marker absent but intent says confirmed → drift.
        let redisConfirmed = true;
        if (intent.redisConfirmKey) {
          const exists = await this.redis.exists(intent.redisConfirmKey);
          redisConfirmed = exists === 1;
        }

        if (!redisConfirmed || (cap && cap.reserved < 0)) {
          report.drifted++;

          // Detach by issuing a REFUND ledger entry (releases the slot).
          const entry = em.getRepository(ReservationLedgerEntry).create({
            id: generateId(),
            reservationId: intent.reservationId,
            capacityUnitRef: intent.capacityUnitRef,
            action: "REFUND",
            quantity: intent.quantity,
            gLevel: intent.gLevel as GLevel,
            idempotencyKey: `reconcile-${intent.id}`,
            evidence: {
              reconciliation: "suspicious-token-detach",
              redisConfirmed,
            },
          });
          await em.getRepository(ReservationLedgerEntry).save(entry);

          if (cap) {
            cap.reserved = Math.max(0, cap.reserved - intent.quantity);
            await em.getRepository(CapacityLedger).save(cap);
          }
          report.refunded++;
          report.detached++;
          emit(
            `Detached/refunded suspicious reservation ${intent.reservationId} (intent ${intent.id}); Redis-confirm=${redisConfirmed}`,
          );
        }
      }
    });

    return report;
  }
}
