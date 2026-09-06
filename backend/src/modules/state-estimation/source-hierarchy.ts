// §13.2 — Contextual source hierarchy.
// When sources conflict, the authoritative source for the context (e.g.
// turnstile > CCTV > WiFi for entry counts) is NOT auto-demoted. Disagreement
// lowers confidence but the central estimate stays context-weighted.
import { Injectable } from "@nestjs/common";

export type ContextKind = "entries" | "occupancy" | "density" | "exits";

export interface SourceRank {
  sourceId: string;
  context: ContextKind;
  authority: number; // 0..1 — higher = more authoritative for this context
  weight: number; // fusion weight (pre-disagreement)
}

/** §13.2 — default authority order for entry counts: gate/turnstile > CCTV > WiFi. */
export const DEFAULT_AUTHORITY: Record<ContextKind, string[]> = {
  entries: ["turnstile", "cctv", "wifi"],
  occupancy: ["cctv", "turnstile", "wifi"],
  density: ["cctv", "turnstile", "wifi"],
  exits: ["turnstile", "cctv", "wifi"],
};

@Injectable()
export class SourceHierarchyService {
  /**
   * §13.2 — compute authority for a source given its modality + context.
   * Unknown modalities get the lowest authority (never auto-promoted).
   */
  authorityFor(modality: string, context: ContextKind): number {
    const order = DEFAULT_AUTHORITY[context];
    const idx = order.indexOf(modality);
    if (idx < 0) return 0.1; // unlisted => near-zero authority, not assumed
    return 1 - idx / order.length; // first = 1.0, last = smallest
  }

  /**
   * §13.2 — context-weighted central estimate. Weights are normalized by
   * authority; disagreement only lowers the returned confidence, it does not
   * demote the authoritative source to a simple average.
   */
  centralEstimate<T extends { value: number; authority: number }>(
    sources: T[],
  ): { value: number; confidenceDiscount: number } {
    if (sources.length === 0) return { value: 0, confidenceDiscount: 1 };
    const totalAuthority = sources.reduce((s, x) => s + x.authority, 0) || 1;
    const value = sources.reduce(
      (s, x) => s + x.value * (x.authority / totalAuthority),
      0,
    );

    // Disagreement metric: weighted spread relative to weighted mean.
    const variance = sources.reduce(
      (s, x) => s + (x.value - value) ** 2 * (x.authority / totalAuthority),
      0,
    );
    const confidenceDiscount = 1 / (1 + Math.sqrt(variance));
    return { value, confidenceDiscount };
  }
}
