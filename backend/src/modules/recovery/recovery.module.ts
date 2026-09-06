// §27 — Recovery & Resilience module
import { Module } from "@nestjs/common";
import { RecoveryController } from "./recovery.controller";
import { SignedOfflineTokenService } from "./signed-offline-token.service";
import { LastKnownPlanService } from "./last-known-plan.service";

@Module({
  controllers: [RecoveryController],
  providers: [SignedOfflineTokenService, LastKnownPlanService],
  exports: [SignedOfflineTokenService, LastKnownPlanService],
})
export class RecoveryModule {}
