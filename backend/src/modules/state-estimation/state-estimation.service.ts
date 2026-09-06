// §13 — L2 State Estimation aggregation.
// Tracks per-zone estimated state and emits CapacityUnitStatusChanged through
// the EventBus whenever the status transitions free/stressed/saturated/
// critical/unavailable.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import { CapacityStatus } from "@core/domain/capacity-unit";
import {
  FusionService,
  FusionResult,
  SourceReading,
  CommitmentPrior,
} from "./fusion.service";

export interface EstimatedState {
  zone: string;
  occupancy: number;
  usableCapacity: number;
  density?: number;
  status: CapacityStatus;
  confidence: number;
  updatedAt: Date;
}

export const STATUS_ORDER: CapacityStatus[] = [
  "free",
  "stressed",
  "saturated",
  "critical",
  "unavailable",
];

@Injectable()
export class StateEstimationService {
  private readonly states = new Map<string, EstimatedState>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly fusion: FusionService,
  ) {}

  private classify(occupancy: number, usable: number): CapacityStatus {
    if (usable <= 0) return "unavailable";
    const load = occupancy / usable;
    if (load >= 1) return "critical";
    if (load >= 0.9) return "saturated";
    if (load >= 0.7) return "stressed";
    return "free";
  }

  getState(zone: string): EstimatedState | undefined {
    return this.states.get(zone);
  }

  /**
   * §13 — ingest fused readings for a zone, update state, emit status change
   * on any transition.
   */
  async update(
    zone: string,
    fusionResult: FusionResult,
    usableCapacity: number,
    density: number | undefined,
    now: Date = new Date(),
  ): Promise<EstimatedState> {
    const prev = this.states.get(zone);
    const newStatus = this.classify(
      fusionResult.centralEstimate,
      usableCapacity,
    );
    const next: EstimatedState = {
      zone,
      occupancy: fusionResult.centralEstimate,
      usableCapacity,
      density,
      status: newStatus,
      confidence: fusionResult.confidence,
      updatedAt: now,
    };
    this.states.set(zone, next);

    if (!prev || prev.status !== newStatus) {
      await this.emitStatusChanged(
        zone,
        prev?.status,
        newStatus,
        fusionResult,
        now,
      );
    }
    return next;
  }

  /** Convenience: fuse + update in one call, commitment-conditioned. */
  async fuseAndUpdate(
    zone: string,
    readings: SourceReading[],
    usableCapacity: number,
    prior: CommitmentPrior | null,
    density?: number,
    now: Date = new Date(),
  ): Promise<EstimatedState> {
    const fused = await this.fusion.fuse(zone, readings, prior);
    return this.update(zone, fused, usableCapacity, density, now);
  }

  private emitStatusChanged(
    zone: string,
    prev: CapacityStatus | undefined,
    next: CapacityStatus,
    fused: FusionResult,
    now: Date,
  ): void {
    const ev = new EventPulseDomainEvent<{
      zone: string;
      previousStatus: CapacityStatus | null;
      nextStatus: CapacityStatus;
      confidence: number;
      occupancy: number;
      at: string;
    }>({
      id: generateId(),
      eventName: "CapacityUnitStatusChanged",
      aggregateId: zone,
      timestamp: now,
      version: 1,
      payload: {
        zone,
        previousStatus: prev ?? null,
        nextStatus: next,
        confidence: fused.confidence,
        occupancy: fused.centralEstimate,
        at: now.toISOString(),
      },
    });
    void this.eventBus.publish(ev);
  }
}
