// §14 — L3 Digital Twin module.
import { Module } from "@nestjs/common";
import { DigitalTwinController } from "./digital-twin.controller";
import { DigitalTwinService } from "./digital-twin.service";
import { PropertyGraph } from "./property-graph";

@Module({
  controllers: [DigitalTwinController],
  providers: [DigitalTwinService, PropertyGraph],
  exports: [DigitalTwinService, PropertyGraph],
})
export class DigitalTwinModule {}
