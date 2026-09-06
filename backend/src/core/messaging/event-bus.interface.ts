// §35 — EventBus abstraction (Redis/Kafka adapter swap via EVENT_BUS_PROVIDER)
import { EventPulseDomainEvent } from "../domain/events/base-event";

export interface PublishOptions {
  /** Idempotency key — the consumer should dedupe on this */
  idempotencyKey?: string;
}

export interface SubscribeHandler<T = unknown> {
  (event: EventPulseDomainEvent<T>): void | Promise<void>;
}

export interface EventBusSubscriber {
  /** Subscribe to a specific event name. Returns unsubscribe function. */
  subscribe<T = unknown>(
    eventName: string,
    handler: SubscribeHandler<T>,
  ): () => void;
}

export interface EventBus extends EventBusSubscriber {
  /**
   * Publish an event. At-least-once semantics — consumers must be
   * idempotent (dedupe on event.id / idempotencyKey).
   */
  publish<T>(
    event: EventPulseDomainEvent<T>,
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Close the underlying adapter. Idempotent.
   */
  shutdown(): Promise<void>;
}

/**
 * §35 — A dead-letter (unprocessable) message, routed to the DLT topic.
 */
export interface DeadLetterMessage {
  event: Record<string, unknown>;
  consumer: string;
  reason: string;
  attempts: number;
  occurredAt: Date;
}
