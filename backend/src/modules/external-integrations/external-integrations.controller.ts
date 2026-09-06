// §35/§12.7 — External integrations REST API (geocoding + air quality).
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { GeocodingService } from "./geocoding.service";
import { AirQualityService } from "./air-quality.service";

@Controller()
export class ExternalIntegrationsController {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly airQuality: AirQualityService,
  ) {}

  @Post("geo/geocode")
  async geocode(@Body() body: { query: string; limit?: number }) {
    const results = await this.geocoding.geocode(body.query, body.limit ?? 1);
    return { results };
  }

  @Post("geo/reverse")
  async reverse(@Body() body: { lat: number; lon: number }) {
    const result = await this.geocoding.reverse(body.lat, body.lon);
    return { result };
  }

  @Post("air-quality/current")
  async current(
    @Body() body: { zone: string; lat: number; lon: number },
  ) {
    const reading = await this.airQuality.current(
      body.zone,
      body.lat,
      body.lon,
    );
    return { reading };
  }

  @Get("air-quality/zone/:zone")
  async zone(@Param("zone") zone: string) {
    return { reading: this.airQuality.getCached(zone) };
  }
}
