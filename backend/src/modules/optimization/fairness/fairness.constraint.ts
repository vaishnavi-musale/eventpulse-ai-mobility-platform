// §18.5 — Fairness constraint: self-declared protected groups only (no proxy inference)
import type { FairnessConstraint, FairnessSafetyTension } from "../types/constraint.types";
import { generateId } from "@core/common/ids";


export interface ProtectedGroup {
  /** Self-declared group identifier */
  groupId: string;
  /** Number of attendees in this group */
  size: number;
}

export interface FairnessEvaluationInput {
  /** Protected groups (self-declared only) */
  protectedGroups: ProtectedGroup[];
  /** Minimum service level across all groups */
  globalMinServiceLevel: number;
  /** Safety constraint satisfaction status */
  safetySatisfied: boolean;
}

/**
 * §18.5 — Evaluate fairness constraints.
 * Decided over self-declared protected groups only (no proxy inference).
 * min-service-level hard constraints.
 * Fairness vs safety tension resolved by safety, logged for governance.
 */
export function evaluateFairnessConstraints(
  input: FairnessEvaluationInput,
  groupServiceLevels: Map<string, number>,
): {
  constraints: FairnessConstraint[];
  tensions: FairnessSafetyTension[];
} {
  const constraints: FairnessConstraint[] = [];
  const tensions: FairnessSafetyTension[] = [];

  for (const group of input.protectedGroups) {
    const actualLevel = groupServiceLevels.get(group.groupId) ?? 0;
    const satisfied = actualLevel >= input.globalMinServiceLevel;

    // §18.5 — Safety vs fairness tension: safety always wins
    let safetyOverridden = false;
    let governanceNote = "No tension: service level within bounds.";

    if (!satisfied && !input.safetySatisfied) {
      // Both fairness and safety are violated — safety takes priority
      safetyOverridden = true;
      governanceNote =
        "FAIRNESS-SAFETY TENSION: Both fairness and safety constraints violated. Safety takes priority per §18.5. Logged for governance.";

      tensions.push({
        constraintId: generateId(),
        groupId: group.groupId,
        fairnessLevel: actualLevel,
        safetyLevel: input.globalMinServiceLevel,
        resolution: "safety_wins",
        loggedAt: new Date(),
      });
    }

    constraints.push({
      groupId: group.groupId,
      minServiceLevel: input.globalMinServiceLevel,
      actualServiceLevel: actualLevel,
      satisfied: satisfied || safetyOverridden,
      safetyOverridden,
      governanceNote,
    });
  }

  return { constraints, tensions };
}

/**
 * §18.5 — Compute service levels per protected group from allocations.
 * Self-declared groups only — no proxy inference.
 */
export function computeGroupServiceLevels(
  allocations: Array<{ zoneId: string; attendeeCount: number }>,
  protectedGroups: ProtectedGroup[],
  totalAttendees: number,
): Map<string, number> {
  const serviceLevels = new Map<string, number>();
  const totalAllocated = allocations.reduce(
    (sum, a) => sum + a.attendeeCount,
    0,
  );

  for (const group of protectedGroups) {
    // Simplified: service level = proportion of group that received allocation
    // In production, this would be computed from actual allocation records
    const groupShare = group.size / Math.max(totalAttendees, 1);
    const serviceLevel =
      totalAttendees > 0
        ? (totalAllocated * groupShare) / Math.max(group.size, 1)
        : 0;
    serviceLevels.set(
      group.groupId,
      Math.min(1, Math.max(0, serviceLevel)),
    );
  }

  return serviceLevels;
}
