// §19/§21/§22 — Action Orchestration module (L7)
import { Module } from "@nestjs/common";
import { OrchestrationController } from "./orchestration.controller";
import { OrchestrationService } from "./orchestration.service";
import { AuthorityMatrixService } from "./authority-matrix.service";
import { ChannelDispatchService } from "./channel-dispatch.service";
import { ReplanningService } from "./replanning.service";

@Module({
  controllers: [OrchestrationController],
  providers: [
    OrchestrationService,
    AuthorityMatrixService,
    ChannelDispatchService,
    ReplanningService,
  ],
  exports: [
    OrchestrationService,
    AuthorityMatrixService,
    ChannelDispatchService,
    ReplanningService,
  ],
})
export class OrchestrationModule {}
