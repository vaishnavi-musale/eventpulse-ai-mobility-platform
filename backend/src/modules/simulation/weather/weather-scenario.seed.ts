// §17/§15.4 — Weather scenario seed: sudden_rain uses live weather, not static
import type { WeatherCondition, WeatherSeed } from "../types/scenario.types";

/** §15.4 — Weather feed interface: live weather provider */
export interface WeatherFeed {
  getCurrentWeather(): Promise<WeatherSeed>;
}

/** §15.4 — Static fallback when live feed unavailable */
function staticWeatherSeed(condition: WeatherCondition): WeatherSeed {
  const defaults: Record<
    WeatherCondition,
    { temperature: number; windSpeed: number; precipProbability: number }
  > = {
    clear: { temperature: 22, windSpeed: 5, precipProbability: 0 },
    light_rain: { temperature: 18, windSpeed: 10, precipProbability: 0.4 },
    sudden_rain: { temperature: 20, windSpeed: 15, precipProbability: 0.8 },
    heavy_rain: { temperature: 15, windSpeed: 25, precipProbability: 0.95 },
    extreme_heat: { temperature: 38, windSpeed: 3, precipProbability: 0.02 },
    cold_snap: { temperature: -5, windSpeed: 30, precipProbability: 0.1 },
    high_wind: { temperature: 12, windSpeed: 50, precipProbability: 0.15 },
  };
  const d = defaults[condition];
  return {
    condition,
    temperature: d.temperature,
    windSpeed: d.windSpeed,
    precipProbability: d.precipProbability,
    isLive: false,
    timestamp: new Date(),
  };
}

// §15.4 — Default weather feed using static seeds (replaceable via DI)
export class DefaultWeatherFeed implements WeatherFeed {
  async getCurrentWeather(): Promise<WeatherSeed> {
    return staticWeatherSeed("clear");
  }
}

/**
 * §15.4 — Resolve weather seed for a scenario.
 * For sudden_rain condition: attempt live feed, fall back to static.
 * Other conditions: use static defaults.
 */
export async function resolveWeatherSeed(
  condition: WeatherCondition,
  feed?: WeatherFeed,
): Promise<WeatherSeed> {
  if (condition === "sudden_rain" && feed) {
    try {
      const live = await feed.getCurrentWeather();
      return { ...live, isLive: true, condition: "sudden_rain" };
    } catch {
      return staticWeatherSeed("sudden_rain");
    }
  }
  return staticWeatherSeed(condition);
}
