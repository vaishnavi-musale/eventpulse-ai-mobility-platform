// §12 — L1 Data Ingestion REST API.
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { VerifiedInventoryService } from "./verified-inventory.service";
import { UnsafeZoneService, UnsafeZoneOverlay } from "./unsafe-zone.service";
import { SpikeDetectionService } from "./spike-detection.service";
import { IngestUnitDto } from "./ingestion.dto";

@Controller("ingestion")
export class IngestionController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly verifiedInventory: VerifiedInventoryService,
    private readonly unsafeZone: UnsafeZoneService,
    private readonly spikes: SpikeDetectionService,
  ) {}

  @Post("units")
  async ingestUnit(@Body() dto: IngestUnitDto) {
    const result = await this.ingestion.ingestUnit(
      {
        capacityUnitRef: dto.capacityUnitRef,
        resourceType: dto.resourceType,
        geoZone: dto.geoZone,
        contractCapacity: dto.contractCapacity,
        safetyBufferUnits: dto.safetyBufferUnits,
        headroom: dto.headroom,
        headroomConsented: dto.headroomConsented,
        trust: dto.trust,
        sourceSystem: dto.sourceSystem,
        verificationState: dto.verificationState as never,
      },
      new Date(dto.observedAt),
    );
    return result;
  }

  @Post("unsafe-zones")
  async applyUnsafeZone(
    @Body()
    overlay: {
      zone: string;
      kind: UnsafeZoneOverlay["kind"];
      validUntil: string;
      source: string;
      severity: UnsafeZoneOverlay["severity"];
    },
  ) {
    await this.unsafeZone.applyOverlay({
      zone: overlay.zone,
      kind: overlay.kind,
      validUntil: new Date(overlay.validUntil),
      source: overlay.source,
      severity: overlay.severity,
    });
    return { applied: true, zone: overlay.zone };
  }

  @Get("unsafe-zones/:zone")
  redirectGuard(
    @Param("zone") zone: string,
    @Query("asof") asOf?: string,
  ) {
    return this.unsafeZone.canRedirectInto(
      zone,
      asOf ? new Date(asOf) : undefined,
    );
  }

  @Post("spike/observe")
  observeSpike(
    @Body() body: { zone: string; eventClass: string; count: number },
  ) {
    this.spikes.observe(body.zone, body.eventClass, body.count);
    return { observed: true };
  }

  @Get("spike/baseline")
  baseline(
    @Query("zone") zone: string,
    @Query("eventClass") eventClass: string,
  ) {
    return this.spikes.getBaseline(zone, eventClass);
  }

  @Post("inventory/verify")
  verifyInventory(
    @Body()
    body: {
      capacityUnitRef: string;
      newState:
        | "CONTRACTED"
        | "CONFIRMED_REALTIME"
        | "ESTIMATED"
        | "MANUAL";
      evidence: { kind: "contract" | "reservation_confirmation" | "staff_confirmation"; ref: string }[];
      sourceSystem: string;
    },
  ) {
    return this.verifiedInventory.verify({
      capacityUnitRef: body.capacityUnitRef,
      newState: body.newState,
      evidence: body.evidence,
      sourceSystem: body.sourceSystem,
    });
  }
}
