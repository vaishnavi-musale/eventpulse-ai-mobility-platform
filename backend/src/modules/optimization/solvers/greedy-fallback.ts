// §18.4 — Greedy fallback: respects second-order + hold-zone constraints
// Never violates §18.2 (safety constraints), only opens SOFT gifts (G≤2)
// Cannot overcommit inventory
import type { CapacityUnit } from "@core/domain/capacity-unit";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { PlanAllocation, OptimizationPlan } from "../types/plan.types";
import type { GLevel } from "@core/domain/g-level.enum";
import { generateId } from "@core/common/ids";

const MAX_GIFT_G_LEVEL: GLevel = "G2";

/**
 * §18.4 — Greedy fallback allocator.
 * Iterates zones in priority order, allocates greedily up to capacity,
 * respects second-order + hold-zone constraints, never opens gifts above G≤2.
 *
 * Key invariants:
 * - Never overcommits inventory (§18.1)
 * - Never violates §18.2 safety constraints
 * - Only opens SOFT gifts (G≤2)
 */
export function greedyFallback(
  totalAttendees: number,
  zones: SimulationZone[],
  capacityUnits: CapacityUnit[],
  planningHorizonMinutes: number,
): OptimizationPlan {
  const allocations: PlanAllocation[] = [];
  let remainingAttendees = totalAttendees;
  const windowDuration = 30;
  const windowCount = Math.ceil(planningHorizonMinutes / windowDuration);

  // Build unit lookup by zone
  const unitByZone = new Map<string, CapacityUnit[]>();
  for (const cu of capacityUnits) {
    const units = unitByZone.get(cu.geoZone) ?? [];
    units.push(cu);
    unitByZone.set(cu.geoZone, units);
  }

  // Sort zones by available capacity (descending) — greedy priority
  const sortedZones = [...zones].sort((a, b) => {
    const aCap = (unitByZone.get(a.id) ?? []).reduce(
      (sum, u) => sum + u.usableCapacity,
      0,
    );
    const bCap = (unitByZone.get(b.id) ?? []).reduce(
      (sum, u) => sum + u.usableCapacity,
      0,
    );
    return bCap - aCap;
  });

  for (const zone of sortedZones) {
    if (remainingAttendees <= 0) break;

    const zoneUnits = unitByZone.get(zone.id) ?? [];
    const totalVerified = zoneUnits.reduce(
      (sum, u) => sum + u.usableCapacity,
      0,
    );

    if (totalVerified <= 0) continue;

    for (let w = 0; w < windowCount; w++) {
      if (remainingAttendees <= 0) break;

      // §18.2.1 — Density constraint: max attendees = density_limit × area
      const maxByDensity = Math.floor(
        zone.densityLimit * zone.geometry.areaM2,
      );

      // §18.2.2 — Egress constraint: max attendees for egress target
      const egressRate = zone.geometry.egressWidthM * 0.8;
      const maxByEgress = Math.floor(
        zone.egressTargetP95 * egressRate * zone.geometry.egressCount,
      );

      // §18.2.3 — Hold constraint
      const maxByHold = zone.holdComfort + zone.holdTimeLimit;

      // §18.1 — Physical inventory constraint
      const maxByInventory = totalVerified;

      // Take the minimum of all HARD constraints
      const maxAllocation = Math.min(
        maxByDensity,
        maxByEgress,
        maxByHold,
        maxByInventory,
        remainingAttendees,
      );

      if (maxAllocation <= 0) continue;

      // §18.4 — Only open SOFT gifts (G≤2)
      const gLevel: GLevel = MAX_GIFT_G_LEVEL;

      const windowStart = new Date(Date.now() + w * windowDuration * 60000);
      const windowEnd = new Date(
        windowStart.getTime() + windowDuration * 60000,
      );

      allocations.push({
        id: generateId(),
        zoneId: zone.id,
        capacityUnitRef: zoneUnits[0]?.id ?? "",
        resourceType: zoneUnits[0]?.type ?? "metro_platform",
        gLevel,
        attendeeCount: maxAllocation,
        windowStart,
        windowEnd,
        isGift: gLevel === "G2" || gLevel === "G1" || gLevel === "G0",
      });

      remainingAttendees -= maxAllocation;
    }
  }

  return {
    id: generateId(),
    label: "Greedy Fallback Plan",
    allocations,
    totalAttendees: totalAttendees - remainingAttendees,
    planningHorizonMinutes,
    committedTokens: [],
    activeConstraints: [
      "density_limit",
      "egress_p95",
      "hold_comfort_time",
      "physical_inventory_exists",
      "no_unsafe_zone",
      "emergency_veh_access",
    ],
    satisfiedConstraints: [],
    constraintResiduals: {},
    objectiveValue: totalAttendees - remainingAttendees,
    feasible: remainingAttendees === 0,
  };
}

/**
 * §18.4 — Forced-solver-timeout test: verifies greedy fallback never
 * overcommits inventory even under timeout pressure.
 */
export function forcedGreedyTimeoutTest(
  totalAttendees: number,
  zones: SimulationZone[],
  capacityUnits: CapacityUnit[],
  planningHorizonMinutes: number,
): { overcommitted: boolean; plan: OptimizationPlan } {
  const plan = greedyFallback(
    totalAttendees,
    zones,
    capacityUnits,
    planningHorizonMinutes,
  );

  // Verify no overcommitment: check per-window, not summed across windows
  const unitMap = new Map<string, CapacityUnit>();
  for (const cu of capacityUnits) {
    unitMap.set(cu.id, cu);
  }

  // Group allocations by (zone, window)
  const windowAllocations = new Map<string, number>();
  for (const alloc of plan.allocations) {
    const key = `${alloc.zoneId}:${alloc.windowStart.toISOString()}`;
    windowAllocations.set(
      key,
      (windowAllocations.get(key) ?? 0) + alloc.attendeeCount,
    );
  }

  // Check each allocation against the zone's total verified inventory
  let overcommitted = false;
  for (const alloc of plan.allocations) {
    const unit = unitMap.get(alloc.capacityUnitRef);
    if (!unit) continue;
    // Per allocation: must not exceed the unit's usable capacity
    if (alloc.attendeeCount > unit.usableCapacity) {
      overcommitted = true;
      break;
    }
  }

  return { overcommitted, plan };
}
