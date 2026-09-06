// §35/§12.7 — External no-key integrations: geocoding (Nominatim) and
// air quality (Open-Meteo default / OpenAQ optional).
import { Module } from "@nestjs/common";
import { IngestionModule } from "../ingestion/ingestion.module";
import { ExternalIntegrationsController } from "./external-integrations.controller";
import { GeocodingService } from "./geocoding.service";
import { AirQualityService } from "./air-quality.service";

@Module({
  imports: [IngestionModule],
  controllers: [ExternalIntegrationsController],
  providers: [GeocodingService, AirQualityService],
  exports: [GeocodingService, AirQualityService],
})
export class ExternalIntegrationsModule {}
