// §12 — L1 Data Ingestion orchestration.
// Coordinates provider adapters → trust grading → overbooking-aware verified
// inventory → unsafe-zone guard → spike detection → EventBus.
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";
import { BufferProfileRegistry } from "./buffer-profiles";
import { TrustScoringService, TrustComponent } from "./trust.service";
import { VerifiedInventoryService } from "./verified-inventory.service";
import { UnsafeZoneService } from "./unsafe-zone.service";
import { SpikeDetectionService } from "./spike-detection.service";
import {
  computeOperatingCapacity,
  OverbookHeadroom,
} from "./overbooking.model";
import {
  ProviderAdapter,
  ProviderObservation,
} from "./provider-adapter.interface";

export interface IngestUnitCommand {
  capacityUnitRef: string;
  resourceType:
    | "metro_platform"
    | "shuttle_bus"
    | "hotel"
    | "event_gate"
    | "restaurant"
    | "parking"
    | "hold_zone";
  geoZone: string;
  contractCapacity: number;
  safetyBufferUnits: number;
  headroom: OverbookHeadroom;
  headroomConsented: boolean;
  trust: TrustComponent;
  sourceSystem: string;
  verificationState:
    "CONTRACTED" | "CONFIRMED_REALTIME" | "ESTIMATED" | "MANUAL";
}

/** §12 — a fused, trust-graded, overbooking-aware unit ready for L2. */
export interface IngestedCapacity {
  capacityUnitRef: string;
  contractCapacity: number;
  usableCapacity: number;
  savedSafetyBuffer: number;
  releasedHeadroom: number;
  verifiedInventory: boolean;
  verificationState: string;
  cData: number;
  maxGLevel: string;
  bufferProfile: string;
  redirectAllowed: boolean;
  spike?: unknown;
  observedAt: Date;
}

@Injectable()
export class IngestionService {
  private readonly buffers = new BufferProfileRegistry();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly trust: TrustScoringService,
    private readonly verifiedInventory: VerifiedInventoryService,
    private readonly unsafeZone: UnsafeZoneService,
    private readonly spikes: SpikeDetectionService,
  ) {}

  /** §12.5 — pull all observations from a provider adapter. */
  async ingestFromAdapter(
    adapter: ProviderAdapter,
  ): Promise<ProviderObservation[]> {
    const obs = await adapter.pull();
    const emitted: ProviderObservation[] = [];
    for (const o of obs) {
      const ev = new EventPulseDomainEvent({
        id: generateId(),
        eventName: "SourceIngested",
        aggregateId: o.capacityUnitRef,
        timestamp: o.observedAt,
        version: 1,
        payload: {
          sourceSystem: o.sourceSystem,
          capacityUnitRef: o.capacityUnitRef,
        },
      });
      await this.eventBus.publish(ev);
      emitted.push(o);
    }
    return emitted;
  }

  /**
   * §12 — full L1 transform: trust grade → buffer profile → overbooking →
   * verified inventory → unsafe-zone guard → spike detection.
   */
  async ingestUnit(
    cmd: IngestUnitCommand,
    now: Date = new Date(),
  ): Promise<IngestedCapacity> {
    const trustGrade = this.trust.compute(cmd.trust);
    const profile = this.buffers.get(cmd.resourceType);
    const safetyBuffer = profile.reserveFraction * cmd.contractCapacity;
    const opCap = computeOperatingCapacity({
      contractCapacity: cmd.contractCapacity,
      safetyBuffer,
      headroom: cmd.headroom,
      headroomConsented: cmd.headroomConsented,
    });

    const verified = await this.verifiedInventory.verify({
      capacityUnitRef: cmd.capacityUnitRef,
      newState: cmd.verificationState,
      evidence:
        cmd.verificationState === "CONTRACTED" ||
        cmd.verificationState === "CONFIRMED_REALTIME"
          ? [{ kind: "contract", ref: cmd.sourceSystem }]
          : [],
      sourceSystem: cmd.sourceSystem,
    });

    // Fail-safe unsafe-zone guard (§12.7).
    const guard = this.unsafeZone.canRedirectInto(cmd.geoZone, now);

    // Layers 1+2 of spike detection (statistical + cross-verification).
    this.spikes.observe(
      cmd.geoZone,
      cmd.capacityUnitRef,
      cmd.trust.reliability ? 1 : 0,
    );
    const spike = this.spikes.detect(cmd.geoZone, "default", opCap.usable, now);

    const result: IngestedCapacity = {
      capacityUnitRef: cmd.capacityUnitRef,
      contractCapacity: cmd.contractCapacity,
      usableCapacity: opCap.usable,
      savedSafetyBuffer: profile.reserveFraction,
      releasedHeadroom: opCap.releasedHeadroom,
      verifiedInventory: verified.verified,
      verificationState: cmd.verificationState,
      cData: trustGrade.cData,
      maxGLevel: trustGrade.forceMaxGLevel,
      bufferProfile: profile.bufferProfile,
      redirectAllowed: guard.redirectAllowed,
      spike,
      observedAt: now,
    };

    // G5/G3 gating (must be verified). Trust below threshold forces G≤2.
    if (!verified.verified || trustGrade.belowThreshold) {
      result.maxGLevel = "G2";
    }
    return result;
  }
}
