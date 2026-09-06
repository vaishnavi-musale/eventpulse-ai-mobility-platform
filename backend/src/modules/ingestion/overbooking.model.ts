// §12.2 — Overbooking semantics.
// overbook_headroom_P50 is probabilistic expected availability from
// cancellation forecasts + walk-ins — NOT additive capacity.
// Consented operating capacity = contract − safety_buffer + released_headroom.

export interface OverbookHeadroom {
  /** P50 expected availability — point estimate. */
  p50: number;
  /** P10/P90 band captures the range of the expectation, not additive room. */
  p10: number;
  p90: number;
  /** Evidence basis for the expectation (e.g. cancellation model run). */
  evidenceRef: string;
}

export interface OverbookingInput {
  contractCapacity: number;
  safetyBuffer: number;
  headroom: OverbookHeadroom;
  /** Revenue-manager consent for releasing the headroom block. §12.2. */
  headroomConsented: boolean;
}

export interface OperatingCapacityResult {
  /** contract − safety_buffer (+ released headroom only when consented). */
  consentedOperatingCapacity: number;
  /** released block that is verified inventory for this event. §12.2. */
  releasedHeadroom: number;
  usable: number;
  safe: boolean;
}

/**
 * §12.2 — compute consented operating capacity. The headroom is released only
 * with revenue-manager consent; the released block is the verified inventory.
 */
export function computeOperatingCapacity(
  input: OverbookingInput,
): OperatingCapacityResult {
  const base = input.contractCapacity - input.safetyBuffer;
  const released = input.headroomConsented ? input.headroom.p50 : 0;
  return {
    consentedOperatingCapacity: base + released,
    releasedHeadroom: released,
    usable: base + released,
    // A headroom expectation is non-negative — a negative usable would be unsafe.
    safe: base >= 0 && base + input.headroom.p90 <= input.contractCapacity,
  };
}

/** True only when the operating capacity is fully backed by verified inventory. */
export function isFullyVerified(
  verified: boolean,
  releasedHeadroom: number,
): boolean {
  // If any released headroom is included, that block must itself be verified.
  return verified && releasedHeadroom >= 0;
}
