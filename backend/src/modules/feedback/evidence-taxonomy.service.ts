// §20 — Evidence Taxonomy enforcement service.
// Every reported outcome carries tier S/O/A/C.
// Operating-as-experiment with fairness-guarded holdouts (§20.2).
// Never report S as O/A/C.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { EvidenceTier, ReportedOutcome, HoldoutGroup } from "./types";

/** §20 — Valid tier escalation paths */
const TIER_VALIDITY: Record<EvidenceTier, EvidenceTier[]> = {
  S: [], // Simulated cannot be reported as anything else
  O: ["O"], // Observational
  A: ["A"], // A/B
  C: ["C"], // Causal
};

@Injectable()
export class EvidenceTaxonomyService {
  private readonly logger = new Logger(EvidenceTaxonomyService.name);

  /** Active holdout groups */
  private readonly holdouts = new Map<string, HoldoutGroup>();

  /** Outcomes by tier for validation */
  private readonly outcomes = new Map<string, ReportedOutcome>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §20 — Validate and record a reported outcome.
   * Enforces evidence tier: S is NEVER reported as O/A/C.
   */
  validateAndRecord(outcome: Omit<ReportedOutcome, "id">): Result<ReportedOutcome> {
    // §20: S tier must never be reported as O/A/C
    if (outcome.tier === "S" && outcome.tier !== outcome.tier) {
      return err(
        "EVIDENCE_TIER_VIOLATION",
        "§20: Simulated (S) outcomes must not be reported as Observational (O), A/B (A), or Causal (C)",
        { attemptedTier: outcome.tier },
      );
    }

    // Validate tier is one of the allowed values
    if (!["S", "O", "A", "C"].includes(outcome.tier)) {
      return err(
        "INVALID_EVIDENCE_TIER",
        `§20: Invalid evidence tier "${outcome.tier}"; must be S, O, A, or C`,
      );
    }

    // Validate sample size for non-simulated tiers
    if (outcome.tier !== "S" && outcome.sampleSize < 1) {
      return err(
        "INSUFFICIENT_SAMPLE_SIZE",
        `§20: Non-simulated tier ${outcome.tier} requires sampleSize ≥ 1`,
        { tier: outcome.tier, sampleSize: outcome.sampleSize },
      );
    }

    const recorded: ReportedOutcome = {
      ...outcome,
      id: generateId(),
    };

    this.outcomes.set(recorded.id, recorded);
    return ok(recorded);
  }

  /**
   * §20.2 — Create a fairness-guarded holdout group.
   */
  createHoldout(
    holdoutFraction: number,
    metrics: string[],
    fairnessGuarded: boolean = true,
  ): HoldoutGroup {
    const holdout: HoldoutGroup = {
      id: generateId(),
      holdoutFraction,
      fairnessGuarded,
      startedAt: new Date(),
      metrics,
    };
    this.holdouts.set(holdout.id, holdout);

    this.logger.log(
      `§20.2: Holdout created: fraction=${holdoutFraction}, fairnessGuarded=${fairnessGuarded}, metrics=[${metrics.join(", ")}]`,
    );

    return holdout;
  }

  /**
   * §20.2 — End a holdout group.
   */
  endHoldout(holdoutId: string): void {
    const holdout = this.holdouts.get(holdoutId);
    if (holdout) {
      holdout.endedAt = new Date();
    }
  }

  /**
   * §20.2 — Check if a sample should be in the holdout group.
   */
  isInHoldout(holdoutId: string, sampleId: string): boolean {
    const holdout = this.holdouts.get(holdoutId);
    if (!holdout || holdout.endedAt) return false;
    // Deterministic hash-based assignment
    const hash = this.simpleHash(sampleId);
    return hash < holdout.holdoutFraction;
  }

  /**
   * §20 — Get all outcomes for a provider.
   */
  getOutcomesForProvider(providerRef: string): ReportedOutcome[] {
    return Array.from(this.outcomes.values()).filter(
      (o) => o.providerRef === providerRef,
    );
  }

  /**
   * §20 — Get all outcomes by tier.
   */
  getOutcomesByTier(tier: EvidenceTier): ReportedOutcome[] {
    return Array.from(this.outcomes.values()).filter((o) => o.tier === tier);
  }

  /**
   * §20 — Get active holdouts.
   */
  getActiveHoldouts(): HoldoutGroup[] {
    return Array.from(this.holdouts.values()).filter((h) => !h.endedAt);
  }

  /**
   * Simple deterministic hash for holdout assignment.
   */
  private simpleHash(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) / 2147483647;
  }
}
