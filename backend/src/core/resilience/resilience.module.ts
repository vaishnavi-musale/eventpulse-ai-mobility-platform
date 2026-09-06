// §27 — Resilience/recovery primitives module
import { Global, Module } from "@nestjs/common";
import { ReconciliationService } from "./reconciliation.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationIntent } from "../saga/entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "../saga/entities/reservation-ledger-entry.entity";
import { CapacityLedger } from "../saga/entities/capacity-ledger.entity";
import { OperatingModeService } from "./operating-mode.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationIntent,
      ReservationLedgerEntry,
      CapacityLedger,
    ]),
  ],
  providers: [ReconciliationService, OperatingModeService],
  exports: [ReconciliationService, OperatingModeService],
})
export class ResilienceModule {}
