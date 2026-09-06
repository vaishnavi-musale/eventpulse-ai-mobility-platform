// §13 — L2 probabilistic fusion.
// Multi-source fusion with commitment-conditioned priors (§13.1), conflict
// detection + robust outlier downweighting (Huber/Student-t) (§13.2), emitting
// DataConflict. Produces an UncertainValue-calibrated central state.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import {
  createUncertainValue,
  UncertainValue,
} from "@core/common/uncertain-value";
import { SourceHierarchyService, ContextKind } from "./source-hierarchy";

export interface SourceReading {
  sourceId: string;
  modality: string;
  context: ContextKind;
  /** observed count with its uncertainty (std used for fusion weight). */
  value: number;
  sigma: number;
}

export interface CommitmentPrior {
  /** held tokens expected to arrive in the window. */
  heldArrivals: number;
  /** measured slip: fraction of held tokens that actually arrive. */
  slipFraction: number;
}

export interface FusionResult {
  zone: string;
  centralEstimate: number;
  /** post-fusion uncertainty. */
  sigma: number;
  uncertain: UncertainValue;
  /** 0..1 residual confidence after weighting + outlier downweighting. */
  confidence: number;
  conflictDetected: boolean;
  downweightedSources: string[];
}

/** §13.2 — Huber loss robust downweight for conflict handling. */
export class RobustWeighting {
  /** Huber-style weight: moderate deviations keep weight, extreme are trimmed. */
  huberWeight(residualNorm: number, threshold = 2.0): number {
    return Math.abs(residualNorm) <= threshold
      ? 1
      : threshold / Math.abs(residualNorm);
  }

  /** Student-t log-likelihood weight (heavy tail — robust to outliers). */
  studentTWeight(residualNorm: number, df = 4): number {
    return Math.pow(1 + (residualNorm * residualNorm) / df, -(df + 1) / 2);
  }
}

@Injectable()
export class FusionService {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly hierarchy: SourceHierarchyService,
    private readonly robust: RobustWeighting,
  ) {}

  /**
   * §13.1/§13.2 — fuse independent-source readings into a central estimate.
   * 1) commitment-conditioned prior (§13.1) moves the estimate toward held
   *    arrivals minus slip, tightening with prior confidence;
   * 2) context-weighted + robust-downweighted likelihood;
   * 3) emits DataConflict when an outlier is downweighted.
   */
  async fuse(
    zone: string,
    readings: SourceReading[],
    prior: CommitmentPrior | null = null,
  ): Promise<FusionResult> {
    // Weighted mean (context authority), robust-downweighted via Student-t.
    const authorities = readings.map((r) => ({
      ...r,
      authority: this.hierarchy.authorityFor(r.modality, r.context),
    }));

    const firstMean =
      authorities.reduce((s, r) => s + r.value * r.authority, 0) /
      (authorities.length || 1);
    const pooledSigma =
      authorities.reduce((s, r) => s + r.sigma * r.sigma, 0) /
      Math.max(1, authorities.length);

    let total = 0;
    let weightSum = 0;
    const downweighted: string[] = [];
    for (const r of authorities) {
      const residual = (r.value - firstMean) / Math.max(r.sigma, 1e-6);
      const w = this.robust.studentTWeight(residual) * r.authority;
      if (w < 0.2 * r.authority) downweighted.push(r.sourceId);
      total += r.value * w;
      weightSum += w;
    }
    const likelihoodMean = weightSum > 0 ? total / weightSum : firstMean;

    // Commitment-conditioned prior (§13.1): held arrivals minus slip.
    const priorMean = prior
      ? prior.heldArrivals * (1 - prior.slipFraction)
      : null;
    const priorSigma = prior
      ? Math.sqrt(Math.max(prior.heldArrivals, 1))
      : null;

    // Bayesian combine: posterior precision = prior + likelihood precisions.
    let mean = likelihoodMean;
    let sigma = Math.sqrt(pooledSigma);
    if (priorMean !== null && priorSigma !== null) {
      const likPrec = 1 / (sigma * sigma);
      const priPrec = 1 / (priorSigma * priorSigma);
      mean =
        (likelihoodMean * likPrec + priorMean * priPrec) / (likPrec + priPrec);
      sigma = Math.sqrt(1 / (likPrec + priPrec));
    }

    const confidence = (1 / (1 + sigma)) * (1 - downweighted.length * 0.2);
    const uncertain = createUncertainValue(
      mean,
      mean - 1.96 * sigma,
      mean + 1.96 * sigma,
      0.95,
      "uncalibrated",
    );

    if (downweighted.length > 0) {
      await this.emitDataConflict(zone, downweighted, readings);
    }

    return {
      zone,
      centralEstimate: mean,
      sigma,
      uncertain,
      confidence: Math.max(0, Math.min(1, confidence)),
      conflictDetected: downweighted.length > 0,
      downweightedSources: downweighted,
    };
  }

  private emitDataConflict(
    zone: string,
    downweighted: string[],
    readings: SourceReading[],
  ): Promise<void> {
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "DataConflict",
      aggregateId: zone,
      timestamp: new Date(),
      version: 1,
      payload: {
        zone,
        downweightedSources: downweighted,
        sourceCount: readings.length,
      },
    });
    return this.eventBus.publish(ev);
  }
}
