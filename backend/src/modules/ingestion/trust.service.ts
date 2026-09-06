// §12.3 — Trust model C_data.
// C_data = w1·reliability + w2·freshness + w3·accuracy +
//          w4·cross-source_agreement + w5·sensor_health
// Below-threshold trust forces G2-or-lower tokens (never G3/G5).
import { Injectable } from "@nestjs/common";
import { GLevel } from "@core/domain/g-level.enum";

export interface TrustComponent {
  reliability: number; // historic uptime/correctness of the provider
  freshness: number; // age vs cadence target
  accuracy: number; // historical observation error — lower is penalized
  crossSourceAgreement: number; // agreement with independent sources
  sensorHealth: number; // hardware heartbeat / degradation
}

export interface TrustWeights {
  reliability: number;
  freshness: number;
  accuracy: number;
  crossSourceAgreement: number;
  sensorHealth: number;
}

export const DEFAULT_TRUST_WEIGHTS: TrustWeights = {
  reliability: 0.25,
  freshness: 0.2,
  accuracy: 0.2,
  crossSourceAgreement: 0.2,
  sensorHealth: 0.15,
};

/** Below this trust threshold, HARD (G3/G5) tokens must not be issued. */
export const HARD_TOKEN_TRUST_THRESHOLD = 0.6;

export interface TrustGrade {
  cData: number;
  /** max G-level this source/observation may back. */
  forceMaxGLevel: GLevel;
  belowThreshold: boolean;
}

@Injectable()
export class TrustScoringService {
  compute(
    c: TrustComponent,
    weights: TrustWeights = DEFAULT_TRUST_WEIGHTS,
  ): TrustGrade {
    const total =
      weights.reliability +
      weights.freshness +
      weights.accuracy +
      weights.crossSourceAgreement +
      weights.sensorHealth;
    const cData =
      (weights.reliability * c.reliability +
        weights.freshness * c.freshness +
        weights.accuracy * (1 - c.accuracy) + // accuracy is an error rate
        weights.crossSourceAgreement * c.crossSourceAgreement +
        weights.sensorHealth * c.sensorHealth) /
      total;

    const belowThreshold = cData < HARD_TOKEN_TRUST_THRESHOLD;
    // Below threshold => force tokens G≤2. At/above => G3 allowed (G5 needs more).
    return {
      cData,
      forceMaxGLevel: belowThreshold ? ("G2" as GLevel) : ("G3" as GLevel),
      belowThreshold,
    };
  }
}
