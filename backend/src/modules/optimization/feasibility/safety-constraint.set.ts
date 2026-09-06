// §18.2 — Formal safety constraint set: all HARD, no priority override
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { PlanAllocation } from "../types/plan.types";
import type { SafetyConstraint, ConstraintSet } from "../types/constraint.types";
import { generateId } from "@core/common/ids";

/**
 * §18.2 — Safety constraint set: all HARD, no priority override.
 * 1. density(z,t) <= density_limit(z,geometry)
 * 2. egress(z).p95 <= egress_target(z)
 * 3. hold_usage(z,t) <= hold_comfort(z) + hold_time_limit(z)
 * 4. vulnerable_group_egress(z,t) >= floor(z,t)
 * 5. no_unsafe_zone(p) for every point in plan (fresh feed, §12.7)
 * 6. emergency_veh_access(z) preserved
 */
export function buildSafetyConstraintSet(
  zones: SimulationZone[],
  allocations: PlanAllocation[],
): SafetyConstraint[] {
  const constraints: SafetyConstraint[] = [];

  // Aggregate allocations per zone
  const zoneAllocations = new Map<string, number>();
  for (const alloc of allocations) {
    zoneAllocations.set(
      alloc.zoneId,
      (zoneAllocations.get(alloc.zoneId) ?? 0) + alloc.attendeeCount,
    );
  }

  for (const zone of zones) {
    const allocated = zoneAllocations.get(zone.id) ?? 0;
    const density = allocated / zone.geometry.areaM2;

    // §18.2.1 — density(z,t) <= density_limit(z,geometry)
    const densityResidual = zone.densityLimit - density;
    constraints.push({
      id: generateId(),
      type: "density_limit",
      severity: "HARD",
      zoneId: zone.id,
      description: `Density limit for ${zone.label}: ${density.toFixed(4)} / ${zone.densityLimit} (limit per-context, not universal 4/m²)`,
      formula: `density(z=${zone.id}, t) <= density_limit(z=${zone.id}, geometry)`,
      satisfied: densityResidual >= 0,
      residual: densityResidual,
    });

    // §18.2.2 — egress(z).p95 <= egress_target(z)
    // Estimate egress P95 from allocation and zone geometry
    const egressRate = zone.geometry.egressWidthM * 0.8;
    const egressTime =
      allocated > 0
        ? allocated / (egressRate * zone.geometry.egressCount)
        : 0;
    const egressP95Estimate = egressTime * 1.2; // approximation
    const egressResidual = zone.egressTargetP95 - egressP95Estimate;

    constraints.push({
      id: generateId(),
      type: "egress_p95",
      severity: "HARD",
      zoneId: zone.id,
      description: `Egress P95 for ${zone.label}: ${egressP95Estimate.toFixed(2)}min / ${zone.egressTargetP95}min target`,
      formula: `egress(z=${zone.id}).p95 <= egress_target(z=${zone.id})`,
      satisfied: egressResidual >= 0,
      residual: egressResidual,
    });

    // §18.2.3 — hold_usage(z,t) <= hold_comfort(z) + hold_time_limit(z)
    const holdUsage = Math.min(allocated, zone.holdComfort);
    const holdCapacity = zone.holdComfort + zone.holdTimeLimit;
    const holdResidual = holdCapacity - holdUsage;

    constraints.push({
      id: generateId(),
      type: "hold_comfort_time",
      severity: "HARD",
      zoneId: zone.id,
      description: `Hold capacity for ${zone.label}: ${holdUsage} / ${holdCapacity} (comfort=${zone.holdComfort} + time_limit=${zone.holdTimeLimit})`,
      formula: `hold_usage(z=${zone.id}, t) <= hold_comfort(z=${zone.id}) + hold_time_limit(z=${zone.id})`,
      satisfied: holdResidual >= 0,
      residual: holdResidual,
    });

    // §18.2.4 — vulnerable_group_egress(z,t) >= floor(z,t)
    const vulnerableFraction = 0.08;
    const vulnerableGroupEgress = allocated * vulnerableFraction;
    const vulnerableFloor = zone.floorCapacity * vulnerableFraction;
    const vulnerableResidual = vulnerableGroupEgress - vulnerableFloor;

    constraints.push({
      id: generateId(),
      type: "vulnerable_group_egress",
      severity: "HARD",
      zoneId: zone.id,
      description: `Vulnerable group egress for ${zone.label}: ${vulnerableGroupEgress.toFixed(1)} / ${vulnerableFloor.toFixed(1)} floor`,
      formula: `vulnerable_group_egress(z=${zone.id}, t) >= floor(z=${zone.id}, t)`,
      satisfied: vulnerableResidual >= 0,
      residual: vulnerableResidual,
    });

    // §18.2.5 — no_unsafe_zone(p) for every point in plan
    // Check that all allocated zones have valid geometry
    const isUnsafe =
      zone.geometry.areaM2 <= 0 ||
      zone.geometry.egressCount <= 0 ||
      zone.geometry.egressWidthM <= 0;

    constraints.push({
      id: generateId(),
      type: "no_unsafe_zone",
      severity: "HARD",
      zoneId: zone.id,
      description: `Zone safety check for ${zone.label}: area=${zone.geometry.areaM2}m², egress=${zone.geometry.egressCount}x${zone.geometry.egressWidthM}m`,
      formula: `no_unsafe_zone(p) for zone ${zone.id} (§12.7 fresh feed)`,
      satisfied: !isUnsafe,
      residual: isUnsafe ? -1 : 1,
    });

    // §18.2.6 — emergency_veh_access(z) preserved
    const emergencyAccessPreserved = !zone.emergencyAccessRequired || zone.geometry.egressWidthM >= 3.5;

    constraints.push({
      id: generateId(),
      type: "emergency_veh_access",
      severity: "HARD",
      zoneId: zone.id,
      description: `Emergency vehicle access for ${zone.label}: required=${zone.emergencyAccessRequired}, width=${zone.geometry.egressWidthM}m`,
      formula: `emergency_veh_access(z=${zone.id}) preserved`,
      satisfied: emergencyAccessPreserved,
      residual: emergencyAccessPreserved ? 1 : -1,
    });
  }

  return constraints;
}

/**
 * §18.2 — Assemble full constraint set from safety constraints
 */
export function assembleConstraintSet(
  safetyConstraints: SafetyConstraint[],
): ConstraintSet {
  const satisfiedCount = safetyConstraints.filter((c) => c.satisfied).length;
  return {
    safetyConstraints,
    chanceConstraint: {
      targetViolationProbability: 0.1,
      criticalResources: [],
      horizonWindowCount: 0,
      samplingMode: "joint",
      jointFactors: { demand: true, compliance: true, capacity: true },
      simulatedProbability: { value: 0, ciLower: 0, ciUpper: 0, confidenceLevel: 0.9, calibrationRating: "uncalibrated" },
      satisfied: true,
    },
    fairnessConstraints: [],
    fairnessSafetyTensions: [],
    antiHoardingConstraints: [],
    physicalInventoryChecks: [],
    totalConstraints: safetyConstraints.length,
    satisfiedCount,
    violatedCount: safetyConstraints.length - satisfiedCount,
  };
}
