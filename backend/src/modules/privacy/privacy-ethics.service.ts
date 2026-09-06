// §37 — Privacy & Ethics.
// k≥50 applied per zone per time window per segment (not globally) with
// differential-privacy composition accounting for repeated releases (§37.1);
// a RetentionPartition that separates raw purge (72h) from the audit ledger
// (evidence, never raw PII) (§37.2); and consent-gated orchestration with a
// guaranteed safe-exit path before token teardown (§37.3/§37.4).
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { generateId } from "@core/common/ids";

/** §37.1 — a single privacy-release stratum key. */
export interface PrivacyStratumKey {
  zone: string;
  timeWindowMs: number;
  segment: string;
}

/** §37.1 — composition state for repeated releases covering one crowd. */
interface CompositionState {
  releases: number;
  composedEpsilon: number;
  budgetRemaining: number;
  lastReleaseAt?: Date;
}

/** §37.1 — minimum k per stratum (policy, §30 K4). */
export const K_ANON = 50;
export const EPSILON_BUDGET_PER_STRATUM = 1.0;

/** §37.2 — retention classes. */
export type RetentionClass =
  | "raw_observations"
  | "pseudonymous_ledger"
  | "movement_aggregates"
  | "consent_records"
  | "dispute_records";

interface RetentionPolicy {
  retainForSeconds: number; // -1 => indefinite (audit policy)
  label: string;
}

export { RetentionPolicy };

const RETENTION: Record<RetentionClass, RetentionPolicy> = {
  // §37.2 — raw observations purged 72h post-event.
  raw_observations: { retainForSeconds: 72 * 3600, label: "Purge 72h post-event" },
  // ledger keeps evidence, never raw PII (multi-year by audit policy).
  pseudonymous_ledger: { retainForSeconds: -1, label: "Retain per audit policy (evidence, not raw PII)" },
  // movement aggregates (≥k) retained for planning.
  movement_aggregates: { retainForSeconds: -1, label: "Retain for planning (aggregates ≥ k)" },
  // consent retained as long as any dependent data.
  consent_records: { retainForSeconds: -1, label: "Retain while dependent data exists" },
  // disputes retained until closed + statutory limits.
  dispute_records: { retainForSeconds: -1, label: "Retain until dispute closed + statutory" },
};

@Injectable()
export class PrivacyEthicsService {
  private readonly logger = new Logger(PrivacyEthicsService.name);
  private readonly composition = new Map<string, CompositionState>();
  private readonly purges = new Map<string, { purgedAt: Date; class: RetentionClass }>();

  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBus) {}

  // ── §37.1 k-anonymity + composition ───────────────────────

  /**
   * Check whether releasing a count/cells group on a stratum satisfies k≥50
   * per zone/time-window/segment, accounting for repeated-release composition.
   */
  checkRelease(
    stratum: PrivacyStratumKey,
    cellCounts: number[],
    epsilonPerRelease: number = 0.1,
  ): { allowed: boolean; k: number; reason: string; remainingBudget: number } {
    const key = JSON.stringify(stratum);
    const cellK = cellCounts.length ? Math.min(...cellCounts) : 0;

    const state = this.composition.get(key) ?? {
      releases: 0,
      composedEpsilon: 0,
      budgetRemaining: EPSILON_BUDGET_PER_STRATUM,
    };

    const wouldBe = state.composedEpsilon + epsilonPerRelease;

    if (cellK < K_ANON) {
      return {
        allowed: false,
        k: cellK,
        reason: `§37.1: stratum cell k=${cellK} < ${K_ANON}`,
        remainingBudget: state.budgetRemaining,
      };
    }
    if (wouldBe > EPSILON_BUDGET_PER_STRATUM) {
      return {
        allowed: false,
        k: cellK,
        reason: `§37.1: composition would exceed budget (${state.composedEpsilon.toFixed(2)}→${wouldBe.toFixed(2)})`,
        remainingBudget: state.budgetRemaining,
      };
    }
    // record the release for composition accounting
    this.composition.set(key, {
      releases: state.releases + 1,
      composedEpsilon: wouldBe,
      budgetRemaining: EPSILON_BUDGET_PER_STRATUM - wouldBe,
      lastReleaseAt: new Date(),
    });
    return {
      allowed: true,
      k: cellK,
      reason: `§37.1: k=${cellK} ≥ ${K_ANON}, composed ε=${wouldBe.toFixed(2)}`,
      remainingBudget: EPSILON_BUDGET_PER_STRATUM - wouldBe,
    };
  }

  compositionStatus(stratum: PrivacyStratumKey) {
    const key = JSON.stringify(stratum);
    const s = this.composition.get(key);
    return s ? { ...s } : { releases: 0, composedEpsilon: 0, budgetRemaining: EPSILON_BUDGET_PER_STRATUM };
  }

  kAnonymityMinimum(): { k: number; epsilonBudget: number } {
    return { k: K_ANON, epsilonBudget: EPSILON_BUDGET_PER_STRATUM };
  }

  getRetentionPolicies(): Record<RetentionClass, RetentionPolicy> {
    return RETENTION;
  }

  /** §37.2 — stage a raw record for purge at the class's retention age. */
  schedulePurge(
    rawRef: string,
    cls: RetentionClass,
    observedAt: Date,
  ): { purgedAt: Date; policy: RetentionPolicy } {
    const policy = RETENTION[cls];
    const purgedAt = new Date(observedAt.getTime() + policy.retainForSeconds * 1000);
    this.purges.set(rawRef, { purgedAt, class: cls });
    void this.logger.log(`§37.2: raw ${rawRef} scheduled purged at ${purgedAt.toISOString()} (${policy.label})`);
    return { purgedAt, policy };
  }

  /** Whether a raw ref has passed its purge window. */
  isDueForPurge(rawRef: string, now: Date = new Date()): boolean {
    const p = this.purges.get(rawRef);
    return !!p && p.purgedAt.getTime() <= now.getTime();
  }

  pendingPurges(now: Date = new Date()): string[] {
    return Array.from(this.purges.entries())
      .filter(([, p]) => p.purgedAt.getTime() <= now.getTime())
      .map(([key]) => key);
  }

  // ── §37.3 consent + safe-exit ─────────────────────────────

  /**
   * Consent gate: EventPulse never steers a person who hasn't opted in.
   * Revocation is honored immediately, but inside a managed flow a safe-exit
   * path must be produced and confirmed before token teardown & forgetting.
   */
  checkConsent(attendeeRef: string, consented: boolean, inManagedFlow: boolean): {
    allowed: boolean;
    reason: string;
  } {
    if (consented) return { allowed: true, reason: "consent granted" };
    if (!inManagedFlow) return { allowed: false, reason: "no consent; outside managed flow - no steering" };
    // in-managed flow: still no steering until a safe exit is produced.
    return { allowed: false, reason: "no consent; safe-exit path required before teardown" };
  }

  /**
   * §37.3 — produce a safe-exit path for a withdrawing attendee inside a
   * managed flow: direct to safety, then teardown + forget.
   */
  safeExitPath(attendeeRef: string, zoneRef: string, destinationRef: string): {
    exitPathRef: string;
    attendeeRef: string;
    status: "escorted_to_safety";
    forgetAfter: Date;
  } {
    void this.logger.log(`§37.3: safe exit for ${attendeeRef} in ${zoneRef} -> ${destinationRef}`);
    return {
      exitPathRef: generateId(),
      attendeeRef,
      status: "escorted_to_safety",
      forgetAfter: new Date(Date.now() + 72 * 3600 * 1000),
    };
  }
}
