// §18.7 — Preference elicitation + 3-5 plan Pareto front
import type { OptimizationPlan } from "../types/plan.types";
import type { ParetoFront } from "../types/optimization-result.types";

export interface ObjectiveWeights {
  /** Weight for maximizing served attendees */
  servedWeight: number;
  /** Weight for minimizing violations */
  safetyWeight: number;
  /** Weight for maximizing fairness */
  fairnessWeight: number;
  /** Weight for minimizing cost */
  costWeight: number;
}

export const DEFAULT_OBJECTIVES = [
  "total_served",
  "violation_count",
  "fairness_score",
  "cost",
];

/**
 * §18.7 — Elicit preferences from user.
 * Returns default weights if no preferences provided.
 */
export function elicitPreferences(
  overrides?: Partial<ObjectiveWeights>,
): ObjectiveWeights {
  return {
    servedWeight: overrides?.servedWeight ?? 0.4,
    safetyWeight: overrides?.safetyWeight ?? 0.3,
    fairnessWeight: overrides?.fairnessWeight ?? 0.2,
    costWeight: overrides?.costWeight ?? 0.1,
  };
}

/**
 * §18.7 — Compute Pareto front from candidate plans.
 * Returns 3-5 non-dominated plans.
 */
export function computeParetoFront(
  plans: OptimizationPlan[],
  targetCount: number = 5,
): ParetoFront {
  if (plans.length === 0) {
    return {
      plans: [],
      objectives: DEFAULT_OBJECTIVES,
      dominatedCount: 0,
    };
  }

  // Multi-objective: [served (max), violations (min), cost (min)]
  // Higher = better for served; lower = better for violations/cost
  const objectives = DEFAULT_OBJECTIVES;

  // Compute dominance
  const dominated = new Set<number>();

  for (let i = 0; i < plans.length; i++) {
    if (dominated.has(i)) continue;
    for (let j = 0; j < plans.length; j++) {
      if (i === j || dominated.has(j)) continue;

      // Plan i dominates plan j if:
      // - i is at least as good on all objectives
      // - i is strictly better on at least one objective
      const iBetterOrEqual =
        plans[i].objectiveValue >= plans[j].objectiveValue &&
        (plans[i].constraintResiduals["violations"] ?? 0) <=
          (plans[j].constraintResiduals["violations"] ?? 0);
      const iStrictlyBetter =
        plans[i].objectiveValue > plans[j].objectiveValue ||
        (plans[i].constraintResiduals["violations"] ?? 0) <
          (plans[j].constraintResiduals["violations"] ?? 0);

      if (iBetterOrEqual && iStrictlyBetter) {
        dominated.add(j);
      }
    }
  }

  // Pareto front: non-dominated plans
  const paretoPlans = plans
    .filter((_, i) => !dominated.has(i))
    .sort((a, b) => b.objectiveValue - a.objectiveValue)
    .slice(0, targetCount);

  // Assign Pareto rank
  for (const plan of paretoPlans) {
    plan.paretoRank = 1;
  }

  return {
    plans: paretoPlans,
    objectives,
    dominatedCount: dominated.size,
  };
}

/**
 * §18.7 — Score plans by weighted objective for ranking.
 */
export function scorePlans(
  plans: OptimizationPlan[],
  weights: ObjectiveWeights,
): Array<{ plan: OptimizationPlan; score: number }> {
  const maxServed = Math.max(...plans.map((p) => p.totalAttendees), 1);
  const maxViolations = Math.max(
    ...plans.map(
      (p) => p.constraintResiduals["violations"] ?? 0,
    ),
    1,
  );
  const maxCost = Math.max(
    ...plans.map((p) => p.allocations.reduce((s, a) => s + a.attendeeCount * (a.isGift ? 1 : 0), 0)),
    1,
  );

  return plans
    .map((plan) => {
      const servedNorm = plan.totalAttendees / maxServed;
      const violationsNorm =
        1 - (plan.constraintResiduals["violations"] ?? 0) / maxViolations;
      const costNorm =
        1 -
        plan.allocations.reduce(
          (s, a) => s + a.attendeeCount * (a.isGift ? 1 : 0),
          0,
        ) /
          maxCost;
      const fairnessNorm = plan.feasible ? 1 : 0.5;

      const score =
        weights.servedWeight * servedNorm +
        weights.safetyWeight * violationsNorm +
        weights.fairnessWeight * fairnessNorm +
        weights.costWeight * costNorm;

      return { plan, score };
    })
    .sort((a, b) => b.score - a.score);
}
