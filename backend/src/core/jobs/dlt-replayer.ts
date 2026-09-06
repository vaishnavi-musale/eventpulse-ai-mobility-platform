// §35 — Dead-letter replay worker (at-least-once redelivery).
// Messages routed to the DLT by the Redis adapter after MAX_FAILED_ATTEMPTS are
// re-injected back into the main event stream by a scheduled sweep, so a
// transient subsystem failure doesn't lose domain events permanently. Consumers
// stay idempotent (dedupe on event.id), so redelivery is safe.
import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@core/messaging/redis/redis-client.token";

const DLT_STREAM = "eventpulse:dlt";
const MAIN_STREAM = "eventpulse:events";
const MAX_REPLAY_PER_SWEEP = 200;

export interface DltReplayReport {
  scanned: number;
  replayed: number;
  leftBehind: number;
}

@Injectable()
export class DltReplayer {
  private readonly logger = new Logger(DltReplayer.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Re-inject DLT entries into the main stream (idempotent on consumer side). */
  async replay(): Promise<DltReplayReport> {
    const report: DltReplayReport = { scanned: 0, replayed: 0, leftBehind: 0 };

    // xrange gives oldest-first; a failed event is retried once per sweep.
    const raw = await this.redis.xrange(DLT_STREAM, "-", "+", "COUNT", MAX_REPLAY_PER_SWEEP);
    if (!raw || raw.length === 0) return report;

    for (const [entryId, fields] of raw as Array<[string, string[]]>) {
      report.scanned++;
      const record: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) record[fields[i]] = fields[i + 1];
      const dlt = JSON.parse(record["dlt"] ?? "{}") as Record<string, unknown>;
      const event = dlt.event as Record<string, unknown> | undefined;
      if (!event?.id) {
        report.leftBehind++;
        continue;
      }

      try {
        await this.redis.xadd(
          MAIN_STREAM,
          "*",
          "event",
          JSON.stringify(event),
          "idempotencyKey",
          String(event.id),
          "replayedFromDlt",
          "true",
        );
        await this.redis.xdel(DLT_STREAM, entryId);
        report.replayed++;
      } catch (err) {
        report.leftBehind++;
        this.logger.error(`DLT replay failed for ${entryId}: ${(err as Error).message}`);
      }
    }

    if (report.replayed > 0) {
      this.logger.log(`§35: DLT replay swept ${report.scanned}, replayed ${report.replayed}`);
    }
    return report;
  }
}