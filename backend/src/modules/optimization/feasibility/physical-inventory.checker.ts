// §18.1 — Hard feasibility: physical_inventory_exists
import type { CapacityUnit } from "@core/domain/capacity-unit";
import type { PlanAllocation } from "../types/plan.types";
import type { PhysicalInventoryCheckResult } from "../types/constraint.types";

/**
 * §18.1 — physical_inventory_exists: no plan may exceed verified_inventory.
 * Exceeding contracted inventory = infeasible, not softened.
 *
 * Returns detailed per-unit checks for all allocations.
 */
export function checkPhysicalInventory(
  allocations: PlanAllocation[],
  capacityUnits: CapacityUnit[],
): PhysicalInventoryCheckResult[] {
  const unitMap = new Map<string, CapacityUnit>();
  for (const cu of capacityUnits) {
    unitMap.set(cu.id, cu);
  }

  // Aggregate allocations per capacity unit
  const allocationTotals = new Map<string, number>();
  for (const alloc of allocations) {
    allocationTotals.set(
      alloc.capacityUnitRef,
      (allocationTotals.get(alloc.capacityUnitRef) ?? 0) + alloc.attendeeCount,
    );
  }

  const results: PhysicalInventoryCheckResult[] = [];

  for (const [unitRef, allocatedCount] of allocationTotals) {
    const unit = unitMap.get(unitRef);
    if (!unit) {
      results.push({
        capacityUnitRef: unitRef,
        physicalInventoryExists: false,
        exceedsVerified: true,
        exceedsContracted: true,
        allocatedCount,
        verifiedInventory: 0,
        contractCapacity: 0,
      });
      continue;
    }

    const exceedsVerified = allocatedCount > unit.usableCapacity;
    const exceedsContracted = allocatedCount > unit.contractCapacity;

    results.push({
      capacityUnitRef: unitRef,
      physicalInventoryExists: unit.verifiedInventory || unit.verificationState === "CONFIRMED_REALTIME",
      exceedsVerified,
      exceedsContracted,
      allocatedCount,
      verifiedInventory: unit.usableCapacity,
      contractCapacity: unit.contractCapacity,
    });
  }

  return results;
}

/**
 * §18.1 — Hard feasibility gate: returns true only if no allocation exceeds
 * verified_inventory. Exceeding contracted inventory = infeasible, not softened.
 */
export function isPhysicallyFeasible(
  allocations: PlanAllocation[],
  capacityUnits: CapacityUnit[],
): { feasible: boolean; violations: string[] } {
  const checks = checkPhysicalInventory(allocations, capacityUnits);
  const violations: string[] = [];

  for (const check of checks) {
    if (!check.physicalInventoryExists) {
      violations.push(
        `physical_inventory_exists FAILED for ${check.capacityUnitRef}: no verified inventory (allocated=${check.allocatedCount})`,
      );
    }
    if (check.exceedsVerified) {
      violations.push(
        `exceeds_verified for ${check.capacityUnitRef}: allocated=${check.allocatedCount} > verified=${check.verifiedInventory}`,
      );
    }
    if (check.exceedsContracted) {
      violations.push(
        `exceeds_contracted for ${check.capacityUnitRef}: allocated=${check.allocatedCount} > contracted=${check.contractCapacity}`,
      );
    }
  }

  return {
    feasible: violations.length === 0,
    violations,
  };
}
