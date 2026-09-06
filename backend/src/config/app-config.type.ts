// §35 — Typed application configuration consumed by DI
export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  appName: string;

  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    sagaDb: number;
  };

  eventBus: {
    provider: "redis" | "kafka";
    kafkaBrokers: string;
    kafkaClientId: string;
  };

  otelExporterEndpoint?: string;
  healthcheckTimeoutMs: number;

  security: {
    overrideApiKey: string;
    jwtSecret: string;
    jwtExpiresIn: string;
  };

  weather: {
    provider: "open-meteo" | "manual";
    lat: number;
    lon: number;
    cacheMs: number;
  };

  geocoder: {
    provider: "nominatim" | "none";
    baseUrl: string;
    userAgent: string;
  };

  airQuality: {
    provider: "open-meteo" | "openaq" | "none";
    cacheMs: number;
    noEntryAqi: number;
    cautionAqi: number;
    openaqApiKey: string;
  };

  ai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
  };
}
