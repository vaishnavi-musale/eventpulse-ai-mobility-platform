// §35 — Geocoding service.
// Wraps Nominatim (OpenStreetMap) — a free, no-key, worldwide geocoder.
// Covers India well (cities/roads/POIs from OSM). Free public server is rate
// limited (1 req/sec) and requires a descriptive User-Agent — honored here.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";

export interface GeocodeResult {
  placeId: number;
  lat: number;
  lon: number;
  name: string;
  displayName: string;
  type: string;
  class: string;
  address?: Record<string, string>;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return this.config.geocoder.provider === "nominatim";
  }

  /** §35 — forward geocode: free-form query -> coordinates. */
  async geocode(
    query: string,
    limit: number = 1,
  ): Promise<GeocodeResult[]> {
    if (!this.enabled) return [];
    try {
      const url = new URL(this.config.geocoder.baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", String(limit));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": this.config.geocoder.userAgent },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`Nominatim ${res.status} for "${query}"`);
        return [];
      }
      const data = await res.json();
      return (data as any[]).map((p) => ({
        placeId: p.place_id,
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        name: p.name,
        displayName: p.display_name,
        type: p.type,
        class: p.class,
        address: p.address,
      }));
    } catch (err) {
      this.logger.warn(`Nominatim geocode failed: ${String(err)}`);
      return [];
    }
  }

  /** §35 — reverse geocode: lat/lon -> nearest address. */
  async reverse(lat: number, lon: number): Promise<GeocodeResult | null> {
    if (!this.enabled) return null;
    try {
      const url = new URL(
        "https://nominatim.openstreetmap.org/reverse",
      );
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("format", "json");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": this.config.geocoder.userAgent },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`Nominatim reverse ${res.status}`);
        return null;
      }
      const p = await res.json();
      if (!p || p.error) return null;
      return {
        placeId: p.place_id,
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        name: p.name ?? "",
        displayName: p.display_name,
        type: p.type,
        class: p.class,
        address: p.address,
      };
    } catch (err) {
      this.logger.warn(`Nominatim reverse failed: ${String(err)}`);
      return null;
    }
  }
}
