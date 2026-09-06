// §35 — NestJS ConfigModule wired to Zod validation and typed AppConfig
import { Global, Module } from "@nestjs/common";
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from "@nestjs/config";
import { AppConfig } from "./app-config.type";
import { validateEnv, RawEnv } from "./app-config.schema";

export const APP_CONFIG = "APP_CONFIG";

const ENV_KEYS: ReadonlyArray<keyof RawEnv> = [
  "NODE_ENV",
  "PORT",
  "APP_NAME",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "REDIS_DB",
  "REDIS_SAGA_DB",
  "EVENT_BUS_PROVIDER",
  "KAFKA_BROKERS",
  "KAFKA_CLIENT_ID",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "HEALTHCHECK_TIMEOUT_MS",
  "OVERRIDE_API_KEY",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "WEATHER_PROVIDER",
  "WEATHER_LAT",
  "WEATHER_LON",
  "WEATHER_CACHE_MS",
  "GEOCODER_PROVIDER",
  "GEOCODER_BASE_URL",
  "GEOCODER_USER_AGENT",
  "AIR_QUALITY_PROVIDER",
  "AIR_QUALITY_CACHE_MS",
  "AIR_QUALITY_NO_ENTRY_AQI",
  "AIR_QUALITY_CAUTION_AQI",
  "OPENAQ_API_KEY",
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "AI_TIMEOUT_MS",
];

export function buildAppConfig(raw: RawEnv): AppConfig {
  return {
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
    appName: raw.APP_NAME,
    postgres: {
      host: raw.POSTGRES_HOST,
      port: raw.POSTGRES_PORT,
      user: raw.POSTGRES_USER,
      password: raw.POSTGRES_PASSWORD,
      database: raw.POSTGRES_DB,
    },
    redis: {
      host: raw.REDIS_HOST,
      port: raw.REDIS_PORT,
      password: raw.REDIS_PASSWORD,
      db: raw.REDIS_DB,
      sagaDb: raw.REDIS_SAGA_DB,
    },
    eventBus: {
      provider: raw.EVENT_BUS_PROVIDER,
      kafkaBrokers: raw.KAFKA_BROKERS,
      kafkaClientId: raw.KAFKA_CLIENT_ID,
    },
    otelExporterEndpoint: raw.OTEL_EXPORTER_OTLP_ENDPOINT,
    healthcheckTimeoutMs: raw.HEALTHCHECK_TIMEOUT_MS,
    security: {
      overrideApiKey: raw.OVERRIDE_API_KEY,
      jwtSecret: raw.JWT_SECRET,
      jwtExpiresIn: raw.JWT_EXPIRES_IN,
    },
    weather: {
      provider: raw.WEATHER_PROVIDER,
      lat: raw.WEATHER_LAT,
      lon: raw.WEATHER_LON,
      cacheMs: raw.WEATHER_CACHE_MS,
    },
    geocoder: {
      provider: raw.GEOCODER_PROVIDER,
      baseUrl: raw.GEOCODER_BASE_URL,
      userAgent: raw.GEOCODER_USER_AGENT,
    },
    airQuality: {
      provider: raw.AIR_QUALITY_PROVIDER,
      cacheMs: raw.AIR_QUALITY_CACHE_MS,
      noEntryAqi: raw.AIR_QUALITY_NO_ENTRY_AQI,
      cautionAqi: raw.AIR_QUALITY_CAUTION_AQI,
      openaqApiKey: raw.OPENAQ_API_KEY,
    },
    ai: {
      baseUrl: raw.AI_BASE_URL.replace(/\/+$/, ""),
      apiKey: raw.AI_API_KEY,
      model: raw.AI_MODEL,
      timeoutMs: raw.AI_TIMEOUT_MS,
    },
  };
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (raw: Record<string, unknown>) => validateEnv(raw),
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (config: ConfigService): AppConfig => {
        const env: Record<string, unknown> = {};
        for (const k of ENV_KEYS) {
          const v = config.get<string>(k);
          if (v !== undefined && v !== null) env[k] = v;
        }
        return buildAppConfig(validateEnv(env));
      },
      inject: [ConfigService],
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
