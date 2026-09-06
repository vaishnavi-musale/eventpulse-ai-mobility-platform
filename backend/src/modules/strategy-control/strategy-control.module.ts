// §21 — Strategy-Aware Control & Reflexivity.
// Self-referential loop, reflexivity/crowding-out model, multi-platform
// coexistence, adaptive hysteresis, and the UE vs SO divergence metric.
import { Module } from "@nestjs/common";
import { StrategyControlController } from "./strategy-control.controller";
import { StrategyAwareControlService } from "./strategy-aware-control.service";

@Module({
  controllers: [StrategyControlController],
  providers: [StrategyAwareControlService],
  exports: [StrategyAwareControlService],
})
export class StrategyControlModule {}