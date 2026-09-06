// §27.2 — Health endpoint: GET /health → 200 with DB + Redis status
import { Controller, Get, Inject } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../../messaging/redis/redis-client.token";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private typeOrm: TypeOrmHealthIndicator,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.typeOrm.pingCheck("postgres", { timeout: 5000 }),
      async () => {
        const start = Date.now();
        try {
          await this.redis.ping();
          return {
            redis: {
              status: "up" as const,
              responseTime: Date.now() - start,
            },
          };
        } catch {
          return {
            redis: {
              status: "down" as const,
              responseTime: Date.now() - start,
              message: "Redis ping failed",
            },
          };
        }
      },
    ]);
  }
}
