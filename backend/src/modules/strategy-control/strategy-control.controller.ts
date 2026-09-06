// §21 — Strategy-Aware Control REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { StrategyAwareControlService } from "./strategy-aware-control.service";
import { ReflexivityConfig } from "./strategy-aware-control.service";

@Controller("strategy")
export class StrategyControlController {
  constructor(private readonly strategy: StrategyAwareControlService) {}

  @Get("reflexivity/config")
  reflexivityConfig() {
    return this.strategy.getReflexivityConfig();
  }

  @Post("reflexivity/config")
  configureReflexivity(@Body() body: Partial<ReflexivityConfig>) {
    return this.strategy.configureReflexivity(body);
  }

  @Post("reflexivity/compliance")
  effectiveCompliance(
    @Body() body: { baseCompliance: number; committedVolume: number },
  ) {
    return {
      effectiveCompliance: this.strategy.effectiveCompliance(
        body.baseCompliance,
        body.committedVolume,
      ),
    };
  }

  @Get("hysteresis/:zone")
  hysteresis(@Param("zone") zone: string) {
    return this.strategy.getHysteresis(zone);
  }

  @Post("hysteresis/threshold")
  adaptiveThreshold(
    @Body() body: { zoneRef: string; timeToDangerSeconds: number; dynamicsScore: number },
  ) {
    return this.strategy.adaptiveThreshold(
      body.zoneRef,
      body.timeToDangerSeconds,
      body.dynamicsScore,
    );
  }

  @Post("hysteresis/steady")
  recordSteady(@Body() body: { zoneRef: string }) {
    this.strategy.recordSteady(body.zoneRef);
    return { recorded: true };
  }

  @Post("hysteresis/replanned")
  markReplanned(@Body() body: { zoneRef: string }) {
    this.strategy.markReplanned(body.zoneRef);
    return { replanned: true };
  }

  @Post("equilibrium/divergence")
  divergence(
    @Body() body: { zoneRef: string; soFlow: Record<string, number>; ueFlow: Record<string, number>; redZone?: number },
  ) {
    return this.strategy.divergenceOn(
      body.zoneRef,
      body.soFlow,
      body.ueFlow,
      body.redZone,
    );
  }

  @Get("multi-platform")
  multiPlatform() {
    return this.strategy.getMultiPlatform();
  }

  @Post("multi-platform/exchanges")
  registerExchanges(@Body() body: { count: number }) {
    return this.strategy.registerPlatformExchange(body.count);
  }

  @Post("emit")
  async emit(
    @Body() body: { zoneRef: string; type: string; detail: Record<string, unknown> },
  ) {
    await this.strategy.emitStrategyEvent(body.zoneRef, body.type, body.detail);
    return { emitted: true };
  }
}
