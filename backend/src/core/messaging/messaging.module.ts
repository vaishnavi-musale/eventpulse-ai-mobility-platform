// §35 — Messaging module: provides EventBus based on EVENT_BUS_PROVIDER
import { Global, Module, Provider } from "@nestjs/common";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";
import { EVENT_BUS } from "./event-bus.token";
import { RedisEventBusAdapter } from "./redis/redis-event-bus.adapter";
import { KafkaEventBusAdapter } from "./kafka/kafka-event-bus.adapter";
import { REDIS_CLIENT } from "./redis/redis-client.token";
import { RedisModule } from "./redis/redis.module";

const EVENT_BUS_PROVIDER: Provider = {
  provide: EVENT_BUS,
  useFactory: (config: AppConfig, redis: unknown) => {
    if (config.eventBus.provider === "kafka") {
      return new KafkaEventBusAdapter();
    }
    return new RedisEventBusAdapter(redis as never);
  },
  inject: [APP_CONFIG, REDIS_CLIENT],
};

@Global()
@Module({
  imports: [RedisModule],
  providers: [EVENT_BUS_PROVIDER],
  exports: [EVENT_BUS],
})
export class MessagingModule {}
