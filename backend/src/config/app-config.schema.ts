// §35 implementation & technology — centralized typed config with Zod validation
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default("eventpulse-backend"),

  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().default("eventpulse"),
  POSTGRES_PASSWORD: z.string().default("eventpulse_dev"),
  POSTGRES_DB: z.string().default("eventpulse"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().default(""),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_SAGA_DB: z.coerce.number().int().min(0).max(15).default(1),

  EVENT_BUS_PROVIDER: z.enum(["redis", "kafka"]).default("redis"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("eventpulse"),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  HEALTHCHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  OVERRIDE_API_KEY: z.string().default("change-me-in-prod"),
  JWT_SECRET: z.string().default("change-me-in-prod"),
  JWT_EXPIRES_IN: z.string().default("8h"),

  WEATHER_PROVIDER: z.enum(["open-meteo", "manual"]).default("open-meteo"),
  WEATHER_LAT: z.coerce.number().min(-90).max(90).default(51.5074),
  WEATHER_LON: z.coerce.number().min(-180).max(180).default(-0.1278),
  WEATHER_CACHE_MS: z.coerce.number().int().positive().default(900000),

  GEOCODER_PROVIDER: z
    .enum(["nominatim", "none"])
    .default("nominatim"),
  GEOCODER_BASE_URL: z
    .string()
    .url()
    .default("https://nominatim.openstreetmap.org/search"),
  GEOCODER_USER_AGENT: z.string().default("eventpulse-backend/1.0"),

  AIR_QUALITY_PROVIDER: z
    .enum(["open-meteo", "openaq", "none"])
    .default("open-meteo"),
  AIR_QUALITY_CACHE_MS: z.coerce.number().int().positive().default(900000),
  AIR_QUALITY_NO_ENTRY_AQI: z.coerce.number().int().positive().default(300),
  AIR_QUALITY_CAUTION_AQI: z.coerce.number().int().positive().default(150),
  OPENAQ_API_KEY: z.string().optional().default(""),

  AI_BASE_URL: z
    .string()
    .url()
    .default("https://integrate.api.nvidia.com/v1"),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default("mistralai/mistral-nemotron"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
});

export type RawEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): RawEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return parsed.data;
}
