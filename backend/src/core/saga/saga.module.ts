// §25.5 — Reservation saga module
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationSaga, RESERVATION_SAGA } from "./reservation.saga";
import { ReservationIntent } from "./entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "./entities/reservation-ledger-entry.entity";
import { CapacityLedger } from "./entities/capacity-ledger.entity";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationIntent,
      ReservationLedgerEntry,
      CapacityLedger,
    ]),
  ],
  providers: [{ provide: RESERVATION_SAGA, useClass: ReservationSaga }],
  exports: [RESERVATION_SAGA],
})
export class SagaModule {}
