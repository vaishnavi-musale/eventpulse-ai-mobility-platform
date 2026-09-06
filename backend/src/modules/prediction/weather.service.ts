// §15.4 — Weather service.
// Weather features feed the 15–60 min models and the rain-floor logic
// (indoor_capacity × rain_factor). Weather can be sourced from a live
// no-key tap-API (Open-Meteo) or set manually. A tap-API suffices for MVP;
// the pipeline seats exist from day one.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { WeatherFeatures } from "./forecast-models";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";

const RAIN_FACTOR = 0.9; // indoor occupancy floor multiplier when raining

export interface WeatherConditions {
  precipitationMm: number;
  isRain: boolean;
  source: string;
  fetchedAt: Date;
  /** optional provider-reported metadata. */
  temperatureC?: number;
  windKmh?: number;
}

const OPEN_METEO_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?current=temperature_2m,precipitation,weather_code,wind_speed_10m"; // open-meteo: no key required

/** Map Open-Meteo WMO weather codes to a rain boolean (§15.4 rain-floor). */
function isRainFromWmo(code: number): boolean {
  // 51–67: drizzle/rain/freezing rain; 71–77: snow; 80–82: rain showers; 95–99: thunderstorm w/ precip
  return (code >= 51 && code <= 67) || (code >= 71 && code <= 82) || code >= 95;
}

/** §15.4 — rain-floor factor: indoor capacity × rain_factor. */
export function rainFloor(weather: WeatherConditions | null): WeatherFeatures {
  const isRain = weather?.isRain ?? false;
  const precipitation = weather?.precipitationMm ?? 0;
  return {
    precipitationMm: precipitation,
    isRain,
    indoorCapacityFactor: isRain ? RAIN_FACTOR : 1,
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private current: WeatherConditions | null = null;
  private lastFetchAt = 0;
  private fetchPromise: Promise<WeatherConditions | null> | null = null;
  private manualOverride = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** §15.4 — ingest a weather tap / forecast aggregation (manual override). */
  setConditions(c: Omit<WeatherConditions, "fetchedAt">): void {
    this.current = { ...c, fetchedAt: new Date() };
    this.manualOverride = true;
  }

  getConditions(): WeatherConditions | null {
    return this.current;
  }

  /** §15.4 — features for the L4 models incl. rain-floor. */
  features(): WeatherFeatures {
    return rainFloor(this.current);
  }

  /**
   * §15.4 — ensure a fresh live reading from Open-Meteo (no-key). Falls back
   * to manual conditions on failure/timeout/offline so the pipeline never
   * breaks. Guarantees at most one in-flight fetch at a time (dedupe).
   */
  async refresh(): Promise<WeatherConditions | null> {
    if (this.config.weather.provider !== "open-meteo") {
      return this.current;
    }
    if (this.manualOverride) {
      return this.current;
    }
    const now = Date.now();
    if (now - this.lastFetchAt < this.config.weather.cacheMs) {
      return this.current ?? null;
    }
    if (this.fetchPromise) {
      return this.fetchPromise;
    }
    this.fetchPromise = this.fetchOpenMeteo().finally(() => {
      this.fetchPromise = null;
    });
    return this.fetchPromise;
  }

  private async fetchOpenMeteo(): Promise<WeatherConditions | null> {
    const { lat, lon } = this.config.weather;
    const url = `${OPEN_METEO_ENDPOINT}&latitude=${lat}&longitude=${lon}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`Open-Meteo returned ${res.status}; keeping manual`);
        return this.current ?? null;
      }
      const data = await res.json();
      const c = data?.current;
      if (!c || c.precipitation === undefined) {
        return this.current ?? null;
      }
      const isRain = isRainFromWmo(c.weather_code ?? 0) || c.precipitation > 0;
      this.current = {
        precipitationMm: c.precipitation ?? 0,
        isRain,
        temperatureC: c.temperature_2m,
        windKmh: c.wind_speed_10m,
        source: "open-meteo",
        fetchedAt: new Date(),
      };
      this.lastFetchAt = Date.now();
      this.manualOverride = false;
      return this.current;
    } catch (err) {
      this.logger.warn(`Open-Meteo fetch failed: ${String(err)}`);
      return this.current ?? null;
    }
  }
}
