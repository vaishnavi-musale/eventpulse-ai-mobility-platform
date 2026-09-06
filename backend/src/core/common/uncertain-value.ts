// §23 — UncertainValue: value + confidence interval + calibration rating
// Feeds §23 (Uncertainty, Confidence & Calibration)

export type CalibrationRating =
  "uncalibrated" | "partially_calibrated" | "calibrated" | "well_calibrated";

export interface UncertainValue {
  /** Point estimate */
  value: number;
  /** Lower bound of confidence interval */
  ciLower: number;
  /** Upper bound of confidence interval */
  ciUpper: number;
  /** Confidence level of the interval (e.g. 0.90 for 90% CI) */
  confidenceLevel: number;
  /** Stratified calibration rating per §23.1 */
  calibrationRating: CalibrationRating;
}

export function createUncertainValue(
  value: number,
  ciLower: number,
  ciUpper: number,
  confidenceLevel: number = 0.9,
  calibrationRating: CalibrationRating = "uncalibrated",
): UncertainValue {
  return { value, ciLower, ciUpper, confidenceLevel, calibrationRating };
}
