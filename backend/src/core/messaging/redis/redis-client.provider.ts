// §35 — Redis provider factory for ioredis
import { Provider } from "@nestjs/common";
import Redis from "ioredis";
import { AppConfig } from "../../../config/app-config.type";
import { APP_CONFIG } from "../../../config/config.module";
import { REDIS_CLIENT, REDIS_SAGA_CLIENT } from "./redis-client.token";

export const REDIS_PROVIDERS: Provider[] = [
  {
    provide: REDIS_CLIENT,
    useFactory: (config: AppConfig) => {
      return new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
    },
    inject: [APP_CONFIG],
  },
  {
    provide: REDIS_SAGA_CLIENT,
    useFactory: (config: AppConfig) => {
      return new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.sagaDb,
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
    },
    inject: [APP_CONFIG],
  },
];
