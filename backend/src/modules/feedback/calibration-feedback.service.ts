// §33.2 — Calibration Feedback Loop.
// Pump stratified calibration metrics back to L4 (Agent 2) + commitment analytics
// + recommit SLA hit-rate + G-level downgrade rate + escrow utilization +
// dispute resolution time.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { CalibrationFeedbackMetrics } from "./types";

@Injectable()
export class CalibrationFeedbackService {
  private readonly logger = new Logger(CalibrationFeedbackService.name);

  /** Latest calibration snapshot */
  private latestMetrics: CalibrationFeedbackMetrics | null = null;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §33.2 — Compute and emit calibration feedback metrics.
   */
  async emitCalibrationFeedback(metrics: {
    stratifiedMetrics: Record<string, { expected: number; observed: number }>;
    recommitSLAHitRate: number;
    gLevelDowngradeRate: number;
    escrowUtilization: number;
    avgDisputeResolutionMs: number;
    commitmentFulfillmentRate: number;
  }): Promise<CalibrationFeedbackMetrics> {
    const snapshot: CalibrationFeedbackMetrics = {
      ...metrics,
      snapshotAt: new Date(),
    };
    this.latestMetrics = snapshot;

    // §33.2: Pump back to L4 (Prediction) via EventBus
    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "BaselineUpdated",
      aggregateId: "calibration-feedback",
      version: 1,
      payload: {
        type: "calibration_feedback",
        stratifiedMetrics: snapshot.stratifiedMetrics,
        recommitSLAHitRate: snapshot.recommitSLAHitRate,
        gLevelDowngradeRate: snapshot.gLevelDowngradeRate,
        escrowUtilization: snapshot.escrowUtilization,
        avgDisputeResolutionMs: snapshot.avgDisputeResolutionMs,
        commitmentFulfillmentRate: snapshot.commitmentFulfillmentRate,
      },
    });
    await this.eventBus.publish(event);

    this.logger.log(
      `§33.2: Calibration feedback emitted: recommitSLA=${(snapshot.recommitSLAHitRate * 100).toFixed(1)}%, ` +
      `downgradeRate=${(snapshot.gLevelDowngradeRate * 100).toFixed(1)}%, ` +
      `escrow=${(snapshot.escrowUtilization * 100).toFixed(1)}%`,
    );

    return snapshot;
  }

  /**
   * §33.2 — Get latest calibration snapshot.
   */
  getLatestMetrics(): CalibrationFeedbackMetrics | null {
    return this.latestMetrics ? { ...this.latestMetrics } : null;
  }

  /**
   * §33.2 — Compute calibration error for a stratified bucket.
   * Calibration error = |expected - observed|.
   */
  computeCalibrationError(
    expected: number,
    observed: number,
  ): { absoluteError: number; relativeError: number } {
    const absoluteError = Math.abs(expected - observed);
    const relativeError = expected !== 0 ? absoluteError / expected : 0;
    return { absoluteError, relativeError };
  }

  /**
   * §33.2 — Assess overall calibration across all buckets.
   */
  assessCalibration(
    stratifiedMetrics: Record<string, { expected: number; observed: number }>,
  ): {
    totalError: number;
    bucketErrors: Record<string, number>;
    isWellCalibrated: boolean;
  } {
    let totalError = 0;
    const bucketErrors: Record<string, number> = {};

    for (const [bucket, { expected, observed }] of Object.entries(stratifiedMetrics)) {
      const { absoluteError } = this.computeCalibrationError(expected, observed);
      bucketErrors[bucket] = absoluteError;
      totalError += absoluteError;
    }

    const bucketCount = Object.keys(stratifiedMetrics).length;
    const avgError = bucketCount > 0 ? totalError / bucketCount : 0;

    return {
      totalError,
      bucketErrors,
      isWellCalibrated: avgError < 0.05, // 5% threshold
    };
  }
}
