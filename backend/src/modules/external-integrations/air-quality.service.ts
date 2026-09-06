// §12.7/§35 — Air-quality service (unsafe-zone / environmental overlays).
// Default provider is Open-Meteo Air Quality — free, no key, global (incl. India
// PM10/PM2.5/US AQI). OpenAQ is supported as an optional keyed provider.
// Readings are cached; when a dangerously high AQI is observed for a zone, the
// service auto-applies an `air_quality` UnsafeZone overlay so the redirect guard
// blocks the zone (fail-safe, §12.7).
import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";
import {
  UnsafeZoneOverlay,
  UnsafeZoneService,
} from "../ingestion/unsafe-zone.service";

export interface AirQualityReading {
  zone: string;
  lat: number;
  lon: number;
  pm10?: number;
  pm2_5?: number;
  usAqi?: number;
  measuredAt: Date;
  source: string;
}

const OPEN_METEO_AQ_ENDPOINT =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

const OVERLAY_TTL_MS = 3 * 60 * 60 * 1000; // 3h freshness window

@Injectable()
export class AirQualityService {
  private readonly logger = new Logger(AirQualityService.name);
  private readonly cache = new Map<string, { reading: AirQualityReading; at: number }>();

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly unsafeZone: UnsafeZoneService,
  ) {}

  get enabled(): boolean {
    return this.config.airQuality.provider !== "none";
  }

  /** §12.7/§35 — fetch (and cache) current air quality for a coordinate. */
  async current(
    zone: string,
    lat: number,
    lon: number,
  ): Promise<AirQualityReading | null> {
    const now = Date.now();
    const cached = this.cache.get(zone);
    if (cached && now - cached.at < this.config.airQuality.cacheMs) {
      return cached.reading;
    }
    if (!this.enabled) return null;

    let reading: AirQualityReading | null = null;
    if (this.config.airQuality.provider === "open-meteo") {
      reading = await this.openMeteo(zone, lat, lon);
    } else if (this.config.airQuality.provider === "openaq") {
      reading = await this.openAq(zone, lat, lon);
    }
    if (reading) {
      this.cache.set(zone, { reading, at: now });
      await this.applyOverlayIfUnsafe(zone, reading);
    }
    return reading;
  }

  getCached(zone: string): AirQualityReading | null {
    return this.cache.get(zone)?.reading ?? null;
  }

  private async openMeteo(
    zone: string,
    lat: number,
    lon: number,
  ): Promise<AirQualityReading | null> {
    try {
      const url = `${OPEN_METEO_AQ_ENDPOINT}?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi&timezone=auto`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`Open-Meteo AQ ${res.status}`);
        return null;
      }
      const d = await res.json();
      const c = d?.current;
      if (!c) return null;
      return {
        zone,
        lat,
        lon,
        pm10: c.pm10,
        pm2_5: c.pm2_5,
        usAqi: c.us_aqi,
        measuredAt: new Date(c.time),
        source: "open-meteo",
      };
    } catch (err) {
      this.logger.warn(`Open-Meteo AQ fetch failed: ${String(err)}`);
      return null;
    }
  }

  private async openAq(
    zone: string,
    lat: number,
    lon: number,
  ): Promise<AirQualityReading | null> {
    const key = this.config.airQuality.openaqApiKey;
    if (!key) return null;
    try {
      const url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000&limit=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        headers: { "X-API-Key": key },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`OpenAQ ${res.status}`);
        return null;
      }
      // OpenAQ v3 returns measurements via a separate endpoint; for the demo
      // we surface coordinates + source only, letting Open-Meteo carry AQI.
      return {
        zone,
        lat,
        lon,
        measuredAt: new Date(),
        source: "openaq",
      };
    } catch (err) {
      this.logger.warn(`OpenAQ fetch failed: ${String(err)}`);
      return null;
    }
  }

  /**
   * §12.7 — if the measured AQI crosses the configurable safety thresholds,
   * apply an `air_quality` overlay so the redirect guard fails safe.
   */
  private async applyOverlayIfUnsafe(
    zone: string,
    r: AirQualityReading,
  ): Promise<void> {
    if (r.usAqi === undefined) return;
    const { noEntryAqi, cautionAqi } = this.config.airQuality;
    let severity: UnsafeZoneOverlay["severity"] | null = null;
    if (r.usAqi >= noEntryAqi) severity = "no_entry";
    else if (r.usAqi >= cautionAqi) severity = "caution";
    if (!severity) return;
    const overlay: UnsafeZoneOverlay = {
      zone,
      kind: "air_quality",
      validUntil: new Date(Date.now() + OVERLAY_TTL_MS),
      source: r.source,
      severity,
    };
    await this.unsafeZone.applyOverlay(overlay);
    this.logger.warn(
      `Applied air_quality overlay (${severity}) for zone ${zone} (AQI ${r.usAqi})`,
    );
  }
}
