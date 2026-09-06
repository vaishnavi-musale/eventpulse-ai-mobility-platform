// §17/§15.4 — Scenario & seed types for L5 simulation
import type { CapacityUnit, ResourceType } from "@core/domain/capacity-unit";
import type { GLevel } from "@core/domain/g-level.enum";

// §17.3 — Arena: metro/venue/city zones derived from Agent 1 capacity data
export interface SimulationZone {
  id: string;
  label: string;
  geometry: ZoneGeometry;
  capacityUnits: CapacityUnit[];
  densityLimit: number;
  egressTargetP95: number;
  holdComfort: number;
  holdTimeLimit: number;
  floorCapacity: number;
  emergencyAccessRequired: boolean;
}

export interface ZoneGeometry {
  areaM2: number;
  perimeterM: number;
  egressWidthM: number;
  egressCount: number;
  type: "metro_platform" | "venue_hall" | "city_street" | "open_area";
}

export type WeatherCondition =
  | "clear"
  | "light_rain"
  | "sudden_rain"
  | "heavy_rain"
  | "extreme_heat"
  | "cold_snap"
  | "high_wind";

// §15.4 — Weather as scenario seed: sudden_rain uses live weather
export interface WeatherSeed {
  condition: WeatherCondition;
  /** Temperature in Celsius */
  temperature: number;
  /** Wind speed in km/h */
  windSpeed: number;
  /** Precipitation probability 0..1 */
  precipProbability: number;
  /** Whether this was sourced from live feed vs static */
  isLive: boolean;
  timestamp: Date;
}

export interface ScenarioSeed {
  id: string;
  label: string;
  weather: WeatherSeed;
  /** Random seed for reproducibility */
  rngSeed: number;
  /** Timestamp override for scenario */
  scenarioTime: Date;
}

// §17.2 — Red-team stress configuration
export interface RedTeamConfig {
  /** Compliance rate at lower tail (default 5%) */
  complianceLowPct: number;
  /** Compliance rate at upper tail (default 95%) */
  complianceHighPct: number;
  /** HARD-slip probability (default 50%) */
  hardSlipPct: number;
  /** Historical quantiles override (if available) */
  historicalQuantiles?: Partial<{
    complianceP5: number;
    complianceP95: number;
    hardSlipRate: number;
  }>;
  /** Adversarial provider scenarios */
  adversarialScenarios: AdversarialScenario[];
}

export type AdversarialScenarioType =
  | "capacity_understatement"
  | "inventory_gaming"
  | "hoarding"
  | "coordinated_no_show"
  | "provider_withdrawal";

export interface AdversarialScenario {
  type: AdversarialScenarioType;
  /** Affected resource types */
  affectedResources: ResourceType[];
  /** Severity multiplier 0..1 (fraction of capacity removed/manipulated) */
  severity: number;
  /** Duration in simulation minutes */
  durationMinutes: number;
  /** Label for evidence trail */
  label: string;
}

// §17.1 — Simulation n-size honesty
export interface HonestyPolicy {
  /** Visualization-only threshold: n <= this is flagged */
  vizOnlyThreshold: number;
  /** Minimum n for tail probability claims */
  tailClaimMinN: number;
  /** Minimum n for S-tier evidence */
  sTierMinN: number;
  /** Default CI level for reported metrics */
  defaultCiLevel: number;
}

export const DEFAULT_HONESTY_POLICY: HonestyPolicy = {
  vizOnlyThreshold: 10,
  tailClaimMinN: 100,
  sTierMinN: 500,
  defaultCiLevel: 0.9,
};

export interface PlanAllocation {
  /** Zone ID */
  zoneId: string;
  /** Allocated attendees */
  allocatedCount: number;
  /** G-level allocation */
  gLevel: GLevel;
  /** Resource type this draws from */
  resourceType: ResourceType;
  /** Capacity unit reference */
  capacityUnitRef: string;
  /** Time window */
  windowStart: Date;
  windowEnd: Date;
}

export interface SimulationPlan {
  id: string;
  label: string;
  allocations: PlanAllocation[];
  totalAttendees: number;
  planningHorizonMinutes: number;
}

// §17 — Complete simulation input
export interface SimulationInput {
  plan: SimulationPlan;
  scenario: ScenarioSeed;
  zones: SimulationZone[];
  redTeam?: RedTeamConfig;
  honestyPolicy?: HonestyPolicy;
}
