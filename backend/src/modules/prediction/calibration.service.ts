// §23 — Stratified calibration (as KPI).
// Calibration is measured per: model, horizon, zone, event class AND the
// abnormal-event subsample (§23.1). A model can be well-calibrated overall and
// badly calibrated exactly during dangerous spikes; we report this stratum
// explicitly and refuse confident statements where abnormal coverage is poor.
// §23.2 — minimum observations per stratum before a figure is claimed.
import { Injectable } from "@nestjs/common";
import { CalibrationRating } from "@core/common/uncertain-value";

export interface StratumKey {
  model: string;
  horizon: number;
  zone: string;
  eventClass: string;
}

export interface CalibrationEntry {
  stratum: StratumKey;
  abnormal: boolean; // belongs to the abnormal-event subsample
  predicted: number;
  ciLower: number;
  ciUpper: number;
  actual: number;
}

export interface CalibrationRatingResult {
  rating: CalibrationRating;
  /** fraction of actuals within the predicted CI. */
  coverage: number;
  n: number;
  /** power gate passed? (§23.2 min events before a figure is claimed). */
  sufficientCoverage: boolean;
  /** abnormal stratum well covered? else refuse confident statements (§23.1). */
  abnormalWellCovered: boolean;
}

/** §23.2 — minimum observations before a coverage figure is claimed. */
export const MIN_OBSERVATIONS_PER_STRATUM = 5;

@Injectable()
export class CalibrationService {
  private readonly entries: CalibrationEntry[] = [];

  /** Record a (predicted, actual) calibration pair for validation. */
  record(entry: CalibrationEntry): void {
    this.entries.push(entry);
  }

  /** §23.1 — stratified rating for a stratum over its recorded entries. */
  rate(stratum: StratumKey): CalibrationRatingResult {
    const overall = this.entriesFor(stratum, false);
    const abnormal = this.entriesFor(stratum, true);
    return {
      rating: this.ratingFor(overall, abnormal),
      coverage: coverage(overall),
      n: overall.length,
      sufficientCoverage: overall.length >= MIN_OBSERVATIONS_PER_STRATUM,
      abnormalWellCovered:
        abnormal.length >= MIN_OBSERVATIONS_PER_STRATUM &&
        coverage(abnormal) >= 0.5,
    };
  }

  /** §23.1 — the rating that should travel with a forecast into the EventBus. */
  ratingForStratum(stratum: StratumKey): CalibrationRating {
    return this.rate(stratum).rating;
  }

  private entriesFor(s: StratumKey, abnormal: boolean): CalibrationEntry[] {
    return this.entries.filter(
      (e) =>
        e.stratum.model === s.model &&
        e.stratum.horizon === s.horizon &&
        e.stratum.zone === s.zone &&
        e.stratum.eventClass === s.eventClass &&
        e.abnormal === abnormal,
    );
  }

  private ratingFor(
    overall: CalibrationEntry[],
    abnormal: CalibrationEntry[],
  ): CalibrationRating {
    if (overall.length < MIN_OBSERVATIONS_PER_STRATUM) return "uncalibrated";
    const cov = coverage(overall);
    // §23.1 — refuse confident ("well_calibrated") when abnormal coverage is poor.
    const abnormalCovered =
      abnormal.length >= MIN_OBSERVATIONS_PER_STRATUM &&
      coverage(abnormal) >= 0.7;
    if (cov >= 0.7 && abnormalCovered) return "well_calibrated";
    if (cov >= 0.7) return "calibrated"; // overall ok, abnormal unproven/poor
    return "partially_calibrated";
  }
}

function coverage(entries: CalibrationEntry[]): number {
  if (entries.length === 0) return 0;
  return (
    entries.filter((e) => e.actual >= e.ciLower && e.actual <= e.ciUpper)
      .length / entries.length
  );
}
