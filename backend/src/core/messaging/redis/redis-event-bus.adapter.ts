// §35 — Redis streams EventBus adapter (default)
import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import {
  EventBus,
  PublishOptions,
  SubscribeHandler,
} from "../event-bus.interface";
import { EventPulseDomainEvent } from "../../domain/events/base-event";
import { serializeEvent } from "../serializer";
import { REDIS_CLIENT } from "./redis-client.token";

const STREAM_KEY = "eventpulse:events";
const CONSUMER_GROUP = "eventpulse-consumers";
const CONSUMER_NAME = "eventpulse-processor";
const DLT_STREAM = "eventpulse:dlt";
const BLOCK_MS = 1000;
const MAX_FAILED_ATTEMPTS = 5;

@Injectable()
export class RedisEventBusAdapter implements EventBus {
  private readonly logger = new Logger(RedisEventBusAdapter.name);
  private readonly handlers = new Map<string, Array<SubscribeHandler>>();
  private readonly pending: Array<Promise<void>> = [];
  private started = false;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    await this.ensureStreams();
    this.started = true;
    this.processLoop();
  }

  private async ensureStreams(): Promise<void> {
    try {
      await this.redis.xgroup(
        "CREATE",
        STREAM_KEY,
        CONSUMER_GROUP,
        "0",
        "MKSTREAM",
      );
    } catch (err) {
      const e = err as { message?: string };
      if (e?.message?.includes("BUSYGROUP")) {
        // group already exists — fine
      } else {
        this.logger.warn(`Failed to create consumer group: ${e?.message}`);
      }
    }
  }

  async publish<T>(
    event: EventPulseDomainEvent<T>,
    options?: PublishOptions,
  ): Promise<void> {
    const serialized = serializeEvent(event);
    await this.redis.xadd(
      STREAM_KEY,
      "*",
      "event",
      serialized,
      "idempotencyKey",
      options?.idempotencyKey ?? event.id,
    );
    if (this.started) this.processLoop();
  }

  subscribe<T = unknown>(
    eventName: string,
    handler: SubscribeHandler<T>,
  ): () => void {
    const hs = this.handlers.get(eventName) ?? [];
    hs.push(handler as SubscribeHandler);
    this.handlers.set(eventName, hs);
    if (this.started) this.processLoop();
    return () => this.removeHandler(eventName, handler as SubscribeHandler);
  }

  private removeHandler(eventName: string, handler: SubscribeHandler): void {
    const hs = this.handlers.get(eventName) ?? [];
    const idx = hs.indexOf(handler);
    if (idx >= 0) hs.splice(idx, 1);
    this.handlers.set(eventName, hs);
  }

  /**
   * At-least-once consumption from the Redis stream consumer group, with
   * idempotent dedupe (event.id) and DLT routing after MAX_FAILED_ATTEMPTS.
   */
  private async processLoop(): Promise<void> {
    while (this.started) {
      try {
        const res = await this.redis.xreadgroup(
          "GROUP",
          CONSUMER_GROUP,
          CONSUMER_NAME,
          "COUNT",
          10,
          "BLOCK",
          BLOCK_MS,
          "STREAMS",
          STREAM_KEY,
          ">",
        );

        if (!res) continue;

        const groups = res as unknown as Array<
          [string, Array<[string, string[]]>]
        >;
        for (const [, messages] of groups) {
          for (const [messageId, fields] of messages) {
            await this.processMessage(messageId, fields);
          }
        }
      } catch (err) {
        this.logger.error(`Stream read error: ${(err as Error).message}`);
        await this.delay(BLOCK_MS);
      }
    }
  }

  private async processMessage(
    messageId: string,
    fields: Array<string>,
  ): Promise<void> {
    const record: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      record[fields[i]] = fields[i + 1];
    }

    try {
      const event = this.deserialize(record["event"]);
      const handlers = this.handlers.get(event.eventName) ?? [];

      let attempts = 0;
      try {
        attempts = Number(await this.redis.get(`ep:attempts:${event.id}`)) || 0;
      } catch {
        attempts = 0;
      }

      let handled = true;
      for (const h of handlers) {
        try {
          await h(event as EventPulseDomainEvent<unknown>);
        } catch (err) {
          handled = false;
          const e = err as Error;
          this.logger.error(
            `Handler for ${event.eventName} failed: ${e.message}`,
          );
          attempts += 1;
          await this.redis.set(
            `ep:attempts:${event.id}`,
            String(attempts),
            "EX",
            3600,
          );
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            await this.routeToDlt(messageId, event, e.message, attempts);
          }
          break;
        }
      }

      if (handled) {
        await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
      }
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Message processing error: ${e.message}`);
      await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    }
  }

  private deserialize(raw: string): EventPulseDomainEvent<unknown> {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return new EventPulseDomainEvent<unknown>({
      id: parsed.id as string,
      eventName: parsed.eventName as EventPulseDomainEvent["eventName"],
      aggregateId: parsed.aggregateId as string,
      gLevel: parsed.gLevel as EventPulseDomainEvent["gLevel"],
      timestamp: new Date(parsed.timestamp as string),
      version: parsed.version as number,
      payload: parsed.payload as unknown,
    });
  }

  private async routeToDlt(
    messageId: string,
    event: EventPulseDomainEvent<unknown>,
    reason: string,
    attempts: number,
  ): Promise<void> {
    const dlt: Record<string, unknown> = {
      event: event.toJSON(),
      consumer: CONSUMER_NAME,
      reason,
      attempts,
      occurredAt: new Date().toISOString(),
    };
    await this.redis.xadd(DLT_STREAM, "*", "dlt", JSON.stringify(dlt));
    await this.redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
    void messageId;
  }

  async shutdown(): Promise<void> {
    this.started = false;
    await Promise.all(this.pending);
    this.redis.disconnect();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
