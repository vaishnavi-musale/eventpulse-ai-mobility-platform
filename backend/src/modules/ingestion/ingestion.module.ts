// §12 — L1 Data Ingestion module.
import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService } from "./ingestion.service";
import { TrustScoringService } from "./trust.service";
import { VerifiedInventoryService } from "./verified-inventory.service";
import { UnsafeZoneService } from "./unsafe-zone.service";
import { SpikeDetectionService } from "./spike-detection.service";

@Module({
  controllers: [IngestionController],
  providers: [
    IngestionService,
    TrustScoringService,
    VerifiedInventoryService,
    UnsafeZoneService,
    SpikeDetectionService,
  ],
  exports: [
    IngestionService,
    TrustScoringService,
    VerifiedInventoryService,
    UnsafeZoneService,
    SpikeDetectionService,
  ],
})
export class IngestionModule {}
