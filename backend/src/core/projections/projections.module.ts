// §35 — Projections module: CQRS read-model consumers.
// Subscribes to the EventBus and maintains queryable projections.
import { Module } from "@nestjs/common";
import { ProjectionController } from "./projection.controller";
import { CommitmentProjectionConsumer } from "./commitment-projection.consumer";

@Module({
  controllers: [ProjectionController],
  providers: [CommitmentProjectionConsumer],
  exports: [CommitmentProjectionConsumer],
})
export class ProjectionsModule {}