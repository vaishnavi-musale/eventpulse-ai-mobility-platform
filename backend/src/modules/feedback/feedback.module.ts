// §20/§21/§30 — Feedback & Learning module (L8)
import { Module } from "@nestjs/common";
import { FeedbackController } from "./feedback.controller";
import { EvidenceTaxonomyService } from "./evidence-taxonomy.service";
import { ProviderReputationService } from "./provider-reputation.service";
import { ProviderStarvationWatchService } from "./starvation-watch.service";
import { CalibrationFeedbackService } from "./calibration-feedback.service";
import { UserEquilibriumGuardService } from "./user-equilibrium.service";

@Module({
  controllers: [FeedbackController],
  providers: [
    EvidenceTaxonomyService,
    ProviderReputationService,
    ProviderStarvationWatchService,
    CalibrationFeedbackService,
    UserEquilibriumGuardService,
  ],
  exports: [
    EvidenceTaxonomyService,
    ProviderReputationService,
    ProviderStarvationWatchService,
    CalibrationFeedbackService,
    UserEquilibriumGuardService,
  ],
})
export class FeedbackModule {}
