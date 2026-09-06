// §35 — Kafka EventBus adapter placeholder (swap via EVENT_BUS_PROVIDER)
import { Injectable, Logger } from "@nestjs/common";
import {
  EventBus,
  PublishOptions,
  SubscribeHandler,
} from "../event-bus.interface";
import { EventPulseDomainEvent } from "../../domain/events/base-event";

@Injectable()
export class KafkaEventBusAdapter implements EventBus {
  private readonly logger = new Logger(KafkaEventBusAdapter.name);
  private readonly handlers = new Map<string, Array<SubscribeHandler>>();

  async publish<T>(
    event: EventPulseDomainEvent<T>,
    options?: PublishOptions,
  ): Promise<void> {
    this.logger.warn(
      `[KafkaAdapter] Publish is a placeholder. event=${event.eventName} idempotencyKey=${options?.idempotencyKey ?? event.id}`,
    );
  }

  subscribe<T = unknown>(
    eventName: string,
    handler: SubscribeHandler<T>,
  ): () => void {
    const hs = this.handlers.get(eventName) ?? [];
    hs.push(handler as SubscribeHandler);
    this.handlers.set(eventName, hs);
    return () => {
      const idx = hs.indexOf(handler as SubscribeHandler);
      if (idx >= 0) hs.splice(idx, 1);
    };
  }

  async shutdown(): Promise<void> {
    this.logger.warn("[KafkaAdapter] shutdown placeholder");
  }
}
