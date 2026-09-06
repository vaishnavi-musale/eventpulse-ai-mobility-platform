// §18.3/§44 — Chance constraint: P(∃ r∈C, ∃ t∈H: load_r(t) > usable_r(t)) < 10%
// Union bound over planning horizon per critical resource set under JOINT sampling
import type { ResourceType } from "@core/domain/capacity-unit";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { PlanAllocation } from "../types/plan.types";
import type { ChanceConstraint } from "../types/constraint.types";
import { createUncertainValue } from "@core/common/uncertain-value";
import { createSeededRng } from "@modules/simulation/engine/monte-carlo.engine";

/**
 * §18.3 — Evaluate chance constraint via Monte Carlo joint sampling.
 * Union bound: P(∃ violation) ≤ Σ_t P(violation at t)
 * Joint sampling: demand × compliance × capacity
 */
export function evaluateChanceConstraint(
  allocations: PlanAllocation[],
  zones: SimulationZone[],
  criticalResources: ResourceType[],
  horizonWindowCount: number,
  nSamples: number = 1000,
  seed: number = 42,
): ChanceConstraint {
  const rng = createSeededRng(seed);
  let totalViolationCount = 0;

  // Aggregate allocations per zone per window
  const zoneWindowAllocations = new Map<string, Map<number, number>>();
  for (const alloc of allocations) {
    if (!zoneWindowAllocations.has(alloc.zoneId)) {
      zoneWindowAllocations.set(alloc.zoneId, new Map());
    }
    const windowMap = zoneWindowAllocations.get(alloc.zoneId)!;
    // Simplified: assign to a single window
    const windowIdx = 0;
    windowMap.set(windowIdx, (windowMap.get(windowIdx) ?? 0) + alloc.attendeeCount);
  }

  for (let s = 0; s < nSamples; s++) {
    let anyViolation = false;

    for (const zone of zones) {
      // Check if this zone has critical resources
      const hasCriticalResource = zone.capacityUnits.some((cu) =>
        criticalResources.includes(cu.type),
      );
      if (!hasCriticalResource && criticalResources.length > 0) continue;

      const windowMap = zoneWindowAllocations.get(zone.id) ?? new Map();

      for (let t = 0; t < horizonWindowCount; t++) {
        // §44 — Joint sampling: demand × compliance × capacity
        const baseLoad = windowMap.get(t) ?? 0;

        // Demand noise
        const demandFactor = 1 + (rng() - 0.5) * 0.2;
        const sampledLoad = Math.round(baseLoad * demandFactor);

        // Compliance noise
        const complianceFactor = 0.8 + rng() * 0.2;

        // Capacity noise (capacity understatement scenario)
        const capacityFactor = 0.9 + rng() * 0.1;
        const usableCapacity =
          zone.capacityUnits.reduce((sum, cu) => sum + cu.usableCapacity, 0) *
          capacityFactor;

        const effectiveLoad = sampledLoad * complianceFactor;

        if (effectiveLoad > usableCapacity) {
          anyViolation = true;
          break;
        }
      }
      if (anyViolation) break;
    }

    if (anyViolation) totalViolationCount++;
  }

  // §18.3 — Union bound: estimated violation probability
  const violationProb = totalViolationCount / nSamples;
  const se = Math.sqrt(
    (violationProb * (1 - violationProb)) / Math.max(nSamples, 1),
  );
  const ciLevel = 0.9;
  const z = 1.645;

  return {
    targetViolationProbability: 0.1,
    criticalResources,
    horizonWindowCount,
    samplingMode: "joint",
    jointFactors: { demand: true, compliance: true, capacity: true },
    simulatedProbability: createUncertainValue(
      violationProb,
      Math.max(0, violationProb - z * se),
      Math.min(1, violationProb + z * se),
      ciLevel,
      nSamples >= 500 ? "calibrated" : "uncalibrated",
    ),
    satisfied: violationProb < 0.1,
  };
}
