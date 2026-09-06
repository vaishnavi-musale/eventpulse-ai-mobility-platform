// §18 — L6 Optimization REST API.
import { Body, Controller, Post } from "@nestjs/common";
import { OptimizationService } from "./optimization.service";
import { OptimizationInput, OptimizationPlan } from "./types/plan.types";
import { ObjectiveWeights } from "./pareto/pareto-front.service";
import { ProtectedGroup } from "./fairness/fairness.constraint";

@Controller("optimization")
export class OptimizationController {
  constructor(private readonly optimization: OptimizationService) {}

  @Post("optimize")
  async optimize(
    @Body() body: { input: OptimizationInput; options?: { protectedGroups?: ProtectedGroup[]; objectiveWeights?: Partial<ObjectiveWeights>; solverTimeoutMs?: number } },
  ) {
    return this.optimization.optimize(body.input, body.options);
  }

  @Post("physical-inventory")
  checkPhysicalInventory(
    @Body()
    body: { allocations: OptimizationInput["allocations"]; capacityUnits: OptimizationInput["capacityUnits"] },
  ) {
    return this.optimization.checkPhysicalInventory(
      body.allocations,
      body.capacityUnits,
    );
  }

  @Post("safety-constraints")
  safetyConstraints(
    @Body()
    body: { zones: OptimizationInput["zones"]; allocations: OptimizationInput["allocations"] },
  ) {
    return this.optimization.buildSafetyConstraints(body.zones, body.allocations);
  }

  @Post("greedy-fallback")
  greedyFallback(
    @Body()
    body: { totalAttendees: number; zones: OptimizationInput["zones"]; capacityUnits: OptimizationInput["capacityUnits"]; planningHorizonMinutes: number },
  ) {
    return this.optimization.runGreedyFallback(
      body.totalAttendees,
      body.zones,
      body.capacityUnits,
      body.planningHorizonMinutes,
    );
  }

  @Post("forced-timeout-test")
  forcedTimeoutTest(
    @Body()
    body: { totalAttendees: number; zones: OptimizationInput["zones"]; capacityUnits: OptimizationInput["capacityUnits"]; planningHorizonMinutes: number },
  ) {
    return this.optimization.runForcedTimeoutTest(
      body.totalAttendees,
      body.zones,
      body.capacityUnits,
      body.planningHorizonMinutes,
    );
  }

  @Post("pareto")
  pareto(
    @Body()
    body: { plans: OptimizationPlan[]; targetCount?: number },
  ) {
    return this.optimization.getParetoFront(body.plans, body.targetCount);
  }

  @Post("preferences")
  preferences(@Body() body: { overrides?: Partial<ObjectiveWeights> }) {
    return this.optimization.getPreferences(body.overrides);
  }
}
