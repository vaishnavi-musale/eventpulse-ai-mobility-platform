// §13 — L2 State Estimation module.
import { Module } from "@nestjs/common";
import { StateEstimationController } from "./state-estimation.controller";
import { FusionService, RobustWeighting } from "./fusion.service";
import { SourceHierarchyService } from "./source-hierarchy";
import { OperationalIndependenceService } from "./operational-independence";
import { StateEstimationService } from "./state-estimation.service";

@Module({
  controllers: [StateEstimationController],
  providers: [
    FusionService,
    RobustWeighting,
    SourceHierarchyService,
    OperationalIndependenceService,
    StateEstimationService,
  ],
  exports: [
    StateEstimationService,
    FusionService,
    OperationalIndependenceService,
  ],
})
export class StateEstimationModule {}
