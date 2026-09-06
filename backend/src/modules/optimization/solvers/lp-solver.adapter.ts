// §18 — LP solver adapter using javascript-lp-solver
import type { PlanAllocation } from "../types/plan.types";
import type { SimulationZone } from "@modules/simulation/types/scenario.types";
import type { CapacityUnit } from "@core/domain/capacity-unit";
import { Solver, Model, Solution } from "javascript-lp-solver";

export interface LpProblem {
  /** Variable names → coefficient map */
  variables: Record<string, Record<string, number>>;
  /** Objective: minimize or maximize */
  objective: { type: "min" | "max"; target: string };
  /** Constraints */
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  /** Integer variable names */
  integers: string[];
}

/**
 * §18 — Build LP model from optimization problem.
 * Minimizes/maximizes objective subject to constraints.
 */
export function buildLpModel(problem: LpProblem): Model {
  const model: Model = {
    optimize: problem.objective.target,
    opType: problem.objective.type,
    constraints: problem.constraints,
    variables: problem.variables,
  };

  if (problem.integers.length > 0) {
    model.ints = {};
    for (const intVar of problem.integers) {
      model.ints[intVar] = 1;
    }
  }

  return model;
}

/**
 * §18 — Solve LP problem. Returns solution or null if infeasible.
 */
export function solveLp(problem: LpProblem): Solution | null {
  try {
    const model = buildLpModel(problem);
    const solver = new Solver();
    const result = solver.Solve(model);
    return result.feasible ? result : null;
  } catch {
    return null;
  }
}

/**
 * §18 — Build allocation optimization problem.
 * Decision variables: x[zoneId, windowIndex] = attendee count
 * Objective: maximize total served (or minimize violations)
 */
export function buildAllocationProblem(
  zones: SimulationZone[],
  capacityUnits: CapacityUnit[],
  totalAttendees: number,
  planningHorizonMinutes: number,
): LpProblem {
  const windowCount = Math.ceil(planningHorizonMinutes / 30);
  const variables: LpProblem["variables"] = {};
  const constraints: LpProblem["constraints"] = {};
  const integers: string[] = [];

  // Build unit lookup
  const unitByZone = new Map<string, CapacityUnit[]>();
  for (const cu of capacityUnits) {
    const units = unitByZone.get(cu.geoZone) ?? [];
    units.push(cu);
    unitByZone.set(cu.geoZone, units);
  }

  // Decision variables: x_{z,w} = attendees in zone z at window w
  for (const zone of zones) {
    for (let w = 0; w < windowCount; w++) {
      const varName = `x_${zone.id}_${w}`;
      integers.push(varName);

      // Coefficient: 1 per attendee (objective: maximize served)
      variables[varName] = { [varName]: 1 };

      // §18.2.1 — density constraint: x / area <= density_limit
      constraints[`density_${zone.id}_${w}`] = {
        max: zone.densityLimit * zone.geometry.areaM2,
      };
      variables[varName][`density_${zone.id}_${w}`] =
        1 / zone.geometry.areaM2;

      // §18.2.2 — egress constraint (simplified)
      const egressRate = zone.geometry.egressWidthM * 0.8;
      const maxLoadForEgress =
        zone.egressTargetP95 * egressRate * zone.geometry.egressCount;
      constraints[`egress_${zone.id}_${w}`] = {
        max: Math.floor(maxLoadForEgress),
      };
      variables[varName][`egress_${zone.id}_${w}`] = 1;

      // §18.2.3 — hold constraint
      constraints[`hold_${zone.id}_${w}`] = {
        max: zone.holdComfort + zone.holdTimeLimit,
      };
      variables[varName][`hold_${zone.id}_${w}`] = 1;
    }

    // §18.1 — Physical inventory constraint per zone
    const zoneUnits = unitByZone.get(zone.id) ?? [];
    const maxVerified = zoneUnits.reduce(
      (sum, u) => sum + (u.verifiedInventory ? u.usableCapacity : 0),
      0,
    );
    if (maxVerified > 0) {
      constraints[`inventory_${zone.id}`] = { max: maxVerified };
      for (let w = 0; w < windowCount; w++) {
        const varName = `x_${zone.id}_${w}`;
        variables[varName][`inventory_${zone.id}`] = 1;
      }
    }
  }

  // Total attendees constraint
  constraints.total_attendees = { equal: totalAttendees };
  for (const zone of zones) {
    for (let w = 0; w < windowCount; w++) {
      const varName = `x_${zone.id}_${w}`;
      variables[varName]["total_attendees"] = 1;
    }
  }

  return {
    variables,
    objective: { type: "max", target: "total_served" },
    constraints,
    integers,
  };
}

/**
 * §18 — Extract allocation from LP solution
 */
export function extractAllocations(
  solution: Solution,
  zones: SimulationZone[],
  planningHorizonMinutes: number,
): PlanAllocation[] {
  const windowCount = Math.ceil(planningHorizonMinutes / 30);
  const allocations: PlanAllocation[] = [];
  const windowDuration = 30;

  for (const zone of zones) {
    for (let w = 0; w < windowCount; w++) {
      const varName = `x_${zone.id}_${w}`;
      const val = solution[varName];
      const count = typeof val === "number" ? val : 0;
      if (count > 0) {
        const windowStart = new Date(Date.now() + w * windowDuration * 60000);
        const windowEnd = new Date(windowStart.getTime() + windowDuration * 60000);
        allocations.push({
          id: `${zone.id}_${w}`,
          zoneId: zone.id,
          capacityUnitRef: zone.capacityUnits[0]?.id ?? "",
          resourceType: zone.capacityUnits[0]?.type ?? "metro_platform",
          gLevel: "G2",
          attendeeCount: count,
          windowStart,
          windowEnd,
          isGift: true,
        });
      }
    }
  }

  return allocations;
}
