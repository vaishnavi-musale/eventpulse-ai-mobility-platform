// §27/§25/§23 — Operational scheduled jobs module (reconciliation, DLT relay,
// offline-token expiry, plan escalation, provider cache flush).
import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { DltReplayer } from "./dlt-replayer";
import { ScheduledJobsService } from "./scheduled-jobs.service";
import { RedisProviderCacheFlusher } from "@core/resilience/cache-flusher";
import { REDIS_CLIENT } from "@core/messaging/redis/redis-client.token";
import { RecoveryModule } from "@modules/recovery/recovery.module";
import { CommitmentDeliveryModule } from "@modules/commitment-delivery/commitment-delivery.module";
import { CalibrationModule } from "@modules/calibration/calibration.module";

@Module({
  imports: [RecoveryModule, CommitmentDeliveryModule, CalibrationModule],
  controllers: [JobsController],
  providers: [
    DltReplayer,
    ScheduledJobsService,
    {
      provide: RedisProviderCacheFlusher,
      useFactory: (redis: unknown) => new RedisProviderCacheFlusher(redis as never),
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [DltReplayer, ScheduledJobsService],
})
export class SchedulingModule {}