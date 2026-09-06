// §23 — Uncertainty, Confidence & Calibration KPI service.
// Aggregates stratified calibration reporting (§23.1), minimum-observation
// power gates (§23.2), and a continuous drift monitor. Complements the
// prediction-layer CalibrationService (which records (predicted, actual) pairs
// and rates strata) by exposing read-model snapshots for dashboards and the
// abnormal-event subsample that "the moments that matter" tracking demands.
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  CalibrationService as PredictionCalibration,
  StratumKey,
  MIN_OBSERVATIONS_PER_STRATUM,
} from "@modules/prediction/calibration.service";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EVENT_BUS } from "@core/messaging/event-bus.token";

export interface StratumCoverageReport {
  stratum: StratumKey;
  n: number;
  coverage: number;
  sufficientCoverage: boolean;
  abnormalWellCovered: boolean;
  rating: string;
}

export interface DriftMonitorEntry {
  horizon: number;
  zone: string;
  residualMean: number;
  driftDetected: boolean;
}

@Injectable()
export class CalibrationKFIService {
  private readonly logger = new Logger(CalibrationKFIService.name);
  private readonly drift = new Map<string, DriftMonitorEntry>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prediction: PredictionCalibration,
  ) {}

  /** §23.2 — the power gate (min observations) shared with L4. */
  minimalObservations(): number {
    return MIN_OBSERVATIONS_PER_STRATUM;
  }

  /** §23.1 — coverage report for a stratum incl. the abnormal subsample. */
  coverageFor(stratum: StratumKey): StratumCoverageReport {
    const rated = this.prediction.rate(stratum);
    return {
      stratum,
      n: rated.n,
      coverage: rated.coverage,
      sufficientCoverage: rated.sufficientCoverage,
      abnormalWellCovered: rated.abnormalWellCovered,
      rating: rated.rating,
    };
  }

  /** §23.1 — confidence gate: refuse confident statements on poor abnormal coverage. */
  canMakeConfidentStatement(stratum: StratumKey): {
    allowed: boolean;
    reason: string;
  } {
    const rated = this.prediction.rate(stratum);
    if (!rated.sufficientCoverage) {
      return {
        allowed: false,
        reason: `§23.2: only ${rated.n}/${MIN_OBSERVATIONS_PER_STRATUM} observations in stratum; refusing confident statement`,
      };
    }
    if (!rated.abnormalWellCovered) {
      return {
        allowed: false,
        reason: `§23.1: abnormal-event subsample not well covered; refusing confident (well_calibrated) statement`,
      };
    }
    return { allowed: true, reason: "stratum well covered incl. abnormal subsample" };
  }

  /** §23.2 — continuous drift monitor reset at event-day onset + forced recalib. */
  recordDrift(
    horizon: number,
    zone: string,
    residual: number,
  ): { driftDetected: boolean; residualMean: number } {
    const key = `${zone}:${horizon}`;
    const m = this.drift.get(key) ?? { horizon, zone, residualMean: 0, driftDetected: false };
    m.residualMean = 0.8 * m.residualMean + 0.2 * residual;
    m.driftDetected = Math.abs(m.residualMean) > 15;
    this.drift.set(key, m);
    return { driftDetected: m.driftDetected, residualMean: m.residualMean };
  }

  getDrift(): DriftMonitorEntry[] {
    return Array.from(this.drift.values()).map((d) => ({ ...d }));
  }

  /** §23.2 — forced recalibration at event-day onset clears monitor state. */
  recalibrate(): void {
    this.drift.clear();
    this.logger.log("§23.2: Forced recalibration at event-day onset (drift monitor reset)");
  }
}