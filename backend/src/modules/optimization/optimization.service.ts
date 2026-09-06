// §18 — L6 Optimization service: orchestrator for feasibility, constraints, Pareto front
import { Injectable, Logger } from "@nestjs/common";
import { generateId } from "@core/common/ids";
import type { CapacityUnit } from "@core/domain/capacity-unit";
import type { CommitmentToken } from "@core/domain/commitment-token";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { PlanAllocation, OptimizationInput, OptimizationPlan } from "./types/plan.types";
import type {
  ConstraintSet,
  SafetyConstraint,
  ChanceConstraint,
  FairnessConstraint,
  FairnessSafetyTension,
  AntiHoardingConstraint,
  PhysicalInventoryCheckResult,
} from "./types/constraint.types";
import type {
  OptimizationResult,
  OptimizationEvidenceTag,
  FeasibilityReport,
  ParetoFront,
} from "./types/optimization-result.types";
import { checkPhysicalInventory, isPhysicallyFeasible } from "./feasibility/physical-inventory.checker";
import { buildSafetyConstraintSet, assembleConstraintSet } from "./feasibility/safety-constraint.set";
import { evaluateChanceConstraint } from "./solvers/chance-constraint";
import { greedyFallback, forcedGreedyTimeoutTest } from "./solvers/greedy-fallback";
import {
  evaluateFairnessConstraints,
  computeGroupServiceLevels,
  type ProtectedGroup,
} from "./fairness/fairness.constraint";
import { checkAntiHoarding } from "./anti-hoarding/anti-hoarding.service";
import { computeParetoFront, elicitPreferences, type ObjectiveWeights } from "./pareto/pareto-front.service";

/**
 * §18 — L6 Optimization Service
 *
 * Hard feasibility: physical_inventory_exists (§18.1).
 * Formal safety constraint set (§18.2) — all HARD, no priority override.
 * Chance constraint (§18.3) with union bound under JOINT sampling.
 * Fairness (§18.5) — self-declared protected groups only.
 * Greedy fallback (§18.4) — never overcommits.
 * Anti-hoarding (§18.6) — one G≥2 per category per attendee.
 * Preference elicitation + Pareto front (§18.7).
 */
@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

  /**
   * §18 — Run complete optimization: feasibility → constraints → Pareto front
   */
  async optimize(
    input: OptimizationInput,
    options: {
      protectedGroups?: ProtectedGroup[];
      objectiveWeights?: Partial<ObjectiveWeights>;
      solverTimeoutMs?: number;
    } = {},
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    // §18.1 — Hard feasibility: physical_inventory_exists
    const physicalCheck = checkPhysicalInventory(
      input.allocations,
      input.capacityUnits,
    );
    const feasibility = this.buildFeasibilityReport(
      input.allocations,
      physicalCheck,
    );

    if (!feasibility.feasible) {
      this.logger.warn(
        `Physical inventory check failed: ${feasibility.infeasiblePlanCount} infeasible allocation(s)`,
      );
    }

    // §18.2 — Formal safety constraint set (all HARD)
    const safetyConstraints = buildSafetyConstraintSet(
      input.zones,
      input.allocations,
    );

    // §18.3 — Chance constraint
    const criticalResources = [
      "metro_platform",
      "hotel",
      "event_gate",
      "shuttle_bus",
    ] as const;
    const horizonWindows = Math.ceil(input.planningHorizonMinutes / 30);
    const chanceConstraint = evaluateChanceConstraint(
      input.allocations,
      input.zones,
      [...criticalResources],
      horizonWindows,
    );

    // §18.5 — Fairness
    const protectedGroups = options.protectedGroups ?? [];
    const groupServiceLevels = computeGroupServiceLevels(
      input.allocations,
      protectedGroups,
      input.totalAttendees,
    );
    const { constraints: fairnessConstraints, tensions: fairnessTensions } =
      evaluateFairnessConstraints(
        {
          protectedGroups,
          globalMinServiceLevel: 0.8,
          safetySatisfied: safetyConstraints.every((c) => c.satisfied),
        },
        groupServiceLevels,
      );

    // §18.6 — Anti-hoarding
    const antiHoardingConstraints = checkAntiHoarding(
      input.allocations.length > 0
        ? input.allocations.map((a) => ({
            id: a.id,
            attendeeRef: `attendee-${a.id}`,
            category: "transit_slot" as const,
            capacityUnitRef: a.capacityUnitRef,
            timeWindowStart: a.windowStart,
            timeWindowEnd: a.windowEnd,
            gLevel: a.gLevel,
            state: "held" as const,
            incentiveValue: 0,
            cost: 0,
            channel: "app" as const,
            cancelPolicy: "",
            expiresAt: a.windowEnd,
            verificationMechanism: "scan" as const,
            commitmentLedgerRef: "",
            version: 1,
          }))
        : [],
    );

    // Assemble constraint set
    const constraintSet = assembleConstraintSet(safetyConstraints);
    constraintSet.chanceConstraint = chanceConstraint;
    constraintSet.fairnessConstraints = fairnessConstraints;
    constraintSet.fairnessSafetyTensions = fairnessTensions;
    constraintSet.antiHoardingConstraints = antiHoardingConstraints;
    constraintSet.physicalInventoryChecks = physicalCheck;

    // §18.4 — Greedy fallback (if solver times out or infeasible)
    let usedGreedyFallback = false;
    let plans: OptimizationPlan[] = [];

    if (!feasibility.feasible) {
      // §18.1 — Infeasible: use greedy fallback
      this.logger.warn("Infeasible plan — falling back to greedy allocator");
      const greedyPlan = greedyFallback(
        input.totalAttendees,
        input.zones,
        input.capacityUnits,
        input.planningHorizonMinutes,
      );
      plans = [greedyPlan];
      usedGreedyFallback = true;
    } else {
      // §18.7 — Build Pareto front from candidate plans
      // For now, create variations of the input plan as candidates
      plans = this.generateCandidatePlans(input, safetyConstraints);
      const pareto = computeParetoFront(plans, input.paretoPlanCount);
      plans = pareto.plans;

      // Tag plans with constraint status
      for (const plan of plans) {
        plan.activeConstraints = safetyConstraints.map((c) => c.type);
        plan.satisfiedConstraints = safetyConstraints
          .filter((c) => c.satisfied)
          .map((c) => c.type);
        plan.constraintResiduals = {};
        for (const c of safetyConstraints) {
          plan.constraintResiduals[c.type] = c.residual;
        }
        plan.constraintResiduals["violations"] =
          constraintSet.violatedCount;
      }
    }

    // Build evidence tag
    const evidence: OptimizationEvidenceTag = {
      tier: "S",
      producedBy: usedGreedyFallback ? "greedy_fallback" : "solver",
      solverTimeMs: Date.now() - startTime,
      solverTimedOut: usedGreedyFallback,
      ciLevel: 0.9,
    };

    return {
      id: generateId(),
      plans,
      constraintSet,
      feasibility,
      evidence,
      usedGreedyFallback,
      chanceConstraintSatisfied: chanceConstraint.satisfied,
      fairnessStatus: {
        allGroupsSatisfied: fairnessConstraints.every((c) => c.satisfied),
        tensionsLogged: fairnessTensions.length,
      },
      antiHoardingStatus: {
        allConstraintsSatisfied: antiHoardingConstraints.every(
          (c) => c.satisfied,
        ),
        violationsFound: antiHoardingConstraints.filter(
          (c) => !c.satisfied,
        ).length,
      },
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * §18.1 — Check physical inventory only
   */
  checkPhysicalInventory(
    allocations: PlanAllocation[],
    capacityUnits: CapacityUnit[],
  ): PhysicalInventoryCheckResult[] {
    return checkPhysicalInventory(allocations, capacityUnits);
  }

  /**
   * §18.2 — Build safety constraints only
   */
  buildSafetyConstraints(
    zones: SimulationZone[],
    allocations: PlanAllocation[],
  ): SafetyConstraint[] {
    return buildSafetyConstraintSet(zones, allocations);
  }

  /**
   * §18.4 — Greedy fallback only
   */
  runGreedyFallback(
    totalAttendees: number,
    zones: SimulationZone[],
    capacityUnits: CapacityUnit[],
    planningHorizonMinutes: number,
  ): OptimizationPlan {
    return greedyFallback(
      totalAttendees,
      zones,
      capacityUnits,
      planningHorizonMinutes,
    );
  }

  /**
   * §18.4 — Forced-solver-timeout test
   */
  runForcedTimeoutTest(
    totalAttendees: number,
    zones: SimulationZone[],
    capacityUnits: CapacityUnit[],
    planningHorizonMinutes: number,
  ): { overcommitted: boolean; plan: OptimizationPlan } {
    return forcedGreedyTimeoutTest(
      totalAttendees,
      zones,
      capacityUnits,
      planningHorizonMinutes,
    );
  }

  /**
   * §18.7 — Compute Pareto front
   */
  getParetoFront(
    plans: OptimizationPlan[],
    targetCount: number = 5,
  ): ParetoFront {
    return computeParetoFront(plans, targetCount);
  }

  /**
   * §18.7 — Elicit preferences
   */
  getPreferences(overrides?: Partial<ObjectiveWeights>): ObjectiveWeights {
    return elicitPreferences(overrides);
  }

  // --- Private helpers ---

  private buildFeasibilityReport(
    allocations: PlanAllocation[],
    physicalChecks: PhysicalInventoryCheckResult[],
  ): FeasibilityReport {
    const planChecks = new Map<string, string[]>();
    for (const check of physicalChecks) {
      const planId = allocations.find(
        (a) => a.capacityUnitRef === check.capacityUnitRef,
      )?.id ?? "unknown";
      const violations = planChecks.get(planId) ?? [];
      if (!check.physicalInventoryExists) {
        violations.push(
          `physical_inventory_exists failed for ${check.capacityUnitRef}`,
        );
      }
      if (check.exceedsVerified) {
        violations.push(
          `exceeds_verified for ${check.capacityUnitRef}: ${check.allocatedCount} > ${check.verifiedInventory}`,
        );
      }
      if (check.exceedsContracted) {
        violations.push(
          `exceeds_contracted for ${check.capacityUnitRef}: ${check.allocatedCount} > ${check.contractCapacity}`,
        );
      }
      planChecks.set(planId, violations);
    }

    const feasiblePlans = Array.from(planChecks.entries()).filter(
      ([, v]) => v.length === 0,
    );
    const infeasiblePlans = Array.from(planChecks.entries()).filter(
      ([, v]) => v.length > 0,
    );

    return {
      feasible: infeasiblePlans.length === 0,
      feasiblePlanCount: feasiblePlans.length,
      infeasiblePlanCount: infeasiblePlans.length,
      planChecks: Array.from(planChecks.entries()).map(
        ([planId, violations]) => ({
          planId,
          feasible: violations.length === 0,
          violations,
        }),
      ),
    };
  }

  private generateCandidatePlans(
    input: OptimizationInput,
    safetyConstraints: SafetyConstraint[],
  ): OptimizationPlan[] {
    // Generate 3-5 candidate plans by varying allocation strategies
    const candidates: OptimizationPlan[] = [];

    // Plan 1: Original allocations
    candidates.push({
      id: generateId(),
      label: "Original Plan",
      allocations: input.allocations,
      totalAttendees: input.totalAttendees,
      planningHorizonMinutes: input.planningHorizonMinutes,
      committedTokens: [],
      activeConstraints: [],
      satisfiedConstraints: [],
      constraintResiduals: {},
      objectiveValue: input.totalAttendees,
      feasible: true,
    });

    // Plan 2: Greedy (max capacity)
    const greedyPlan = greedyFallback(
      input.totalAttendees,
      input.zones,
      input.capacityUnits,
      input.planningHorizonMinutes,
    );
    candidates.push(greedyPlan);

    // Plan 3: Conservative (70% capacity)
    candidates.push({
      id: generateId(),
      label: "Conservative Plan (70% capacity)",
      allocations: input.allocations.map((a) => ({
        ...a,
        attendeeCount: Math.round(a.attendeeCount * 0.7),
        id: generateId(),
      })),
      totalAttendees: Math.round(input.totalAttendees * 0.7),
      planningHorizonMinutes: input.planningHorizonMinutes,
      committedTokens: [],
      activeConstraints: [],
      satisfiedConstraints: [],
      constraintResiduals: {},
      objectiveValue: Math.round(input.totalAttendees * 0.7),
      feasible: true,
    });

    // Plan 4: Balanced (85% capacity)
    candidates.push({
      id: generateId(),
      label: "Balanced Plan (85% capacity)",
      allocations: input.allocations.map((a) => ({
        ...a,
        attendeeCount: Math.round(a.attendeeCount * 0.85),
        id: generateId(),
      })),
      totalAttendees: Math.round(input.totalAttendees * 0.85),
      planningHorizonMinutes: input.planningHorizonMinutes,
      committedTokens: [],
      activeConstraints: [],
      satisfiedConstraints: [],
      constraintResiduals: {},
      objectiveValue: Math.round(input.totalAttendees * 0.85),
      feasible: true,
    });

    return candidates;
  }
}
