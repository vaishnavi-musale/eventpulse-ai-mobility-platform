// §16.2 — Operational independence definition.
// Two sources are independent proofs only if: (a) different physical modality,
// (b) no shared upstream failure, (c) measured |ρ|<0.3 on residuals.
// Gate + ticket-scan of the same entry are NOT independent.
import { Injectable } from "@nestjs/common";

export interface SourceIdentity {
  id: string;
  modality: string;
  upstreamDependency?: string;
}

export const INDEPENDENCE_CORRELATION_THRESHOLD = 0.3;

@Injectable()
export class OperationalIndependenceService {
  /**
   * §16.2 — are two sources operationally independent proofs?
   * Different modality + no shared upstream + low residual correlation.
   */
  areIndependent(
    a: SourceIdentity,
    b: SourceIdentity,
    residualCorrelation: number,
  ): boolean {
    const differentModality = a.modality !== b.modality;
    const noSharedUpstream =
      !!a.upstreamDependency &&
      !!b.upstreamDependency &&
      a.upstreamDependency !== b.upstreamDependency;
    // If upstreams are unknown, we must not assert shared-failure independence.
    const upstreamIndependent =
      a.upstreamDependency === undefined || b.upstreamDependency === undefined
        ? false
        : noSharedUpstream;
    const decorrelated =
      Math.abs(residualCorrelation) < INDEPENDENCE_CORRELATION_THRESHOLD;
    return differentModality && upstreamIndependent && decorrelated;
  }

  /** Count how many mutually-independent sources corroborate a claim. */
  countIndependent(
    sources: Array<SourceIdentity & { residualRho: number }>,
  ): number {
    const first = sources[0];
    if (!first) return 0;
    let count = 1;
    for (const s of sources.slice(1)) {
      // Requirement: ≥2 independent sources (§9 layer 2).
      if (this.areIndependent(first, s, s.residualRho)) count++;
    }
    return count;
  }
}
