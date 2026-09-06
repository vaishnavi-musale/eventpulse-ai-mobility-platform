// §12 — L1 ingestion DTOs (validated at the API boundary).
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsString,
  Min,
} from "class-validator";
import { ResourceType } from "@core/domain/capacity-unit";

export class HeadroomDto {
  @IsNumber() @Min(0) p50!: number;
  @IsNumber() @Min(0) p10!: number;
  @IsNumber() @Min(0) p90!: number;
  @IsString() evidenceRef!: string;
}

export class TrustDto {
  @IsNumber() @Min(0) reliability!: number;
  @IsNumber() @Min(0) freshness!: number;
  @IsNumber() @Min(0) accuracy!: number; // error rate 0..1
  @IsNumber() @Min(0) crossSourceAgreement!: number;
  @IsNumber() @Min(0) sensorHealth!: number;
}

export class IngestUnitDto {
  @IsString() capacityUnitRef!: string;
  @IsIn([
    "metro_platform",
    "shuttle_bus",
    "hotel",
    "event_gate",
    "restaurant",
    "parking",
    "hold_zone",
  ] satisfies ResourceType[])
  resourceType!: ResourceType;

  @IsString() geoZone!: string;
  @IsNumber() @Min(0) contractCapacity!: number;
  @IsNumber() @Min(0) safetyBufferUnits!: number;
  @IsBoolean() headroomConsented!: boolean;
  trust!: TrustDto;
  @IsString() sourceSystem!: string;
  @IsEnum(["CONTRACTED", "CONFIRMED_REALTIME", "ESTIMATED", "MANUAL"])
  verificationState!: string;
  @IsDateString() observedAt!: string;

  headroom!: HeadroomDto;
}
