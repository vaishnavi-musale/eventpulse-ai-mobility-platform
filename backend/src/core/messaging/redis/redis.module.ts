// §35 — Redis module: provides ioredis clients for hot counters + saga outbox
import { Global, Module } from "@nestjs/common";
import { REDIS_PROVIDERS } from "./redis-client.provider";

@Global()
@Module({
  providers: [...REDIS_PROVIDERS],
  exports: [...REDIS_PROVIDERS],
})
export class RedisModule {}
