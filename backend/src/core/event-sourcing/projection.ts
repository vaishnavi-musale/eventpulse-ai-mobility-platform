// §32 — Base read-model / projection scaffolding (CQRS is a design choice)
import { EventPulseDomainEvent } from "../domain/events/base-event";

/**
 * §32 — Base projection/read-model scaffold.
 * CQRS is explicitly a design choice, not a requirement (§32).
 * A projection subscribes to domain events and maintains a denormalized read model.
 */
export abstract class Projection {
  /**
   * Which event names this projection consumes.
   */
  abstract handles: readonly string[];

  /**
   * Process one domain event. Implementations must be idempotent
   * (dedupe on event.id) to satisfy at-least-once delivery.
   */
  abstract handle(event: EventPulseDomainEvent): Promise<void>;

  /**
   * Optional one-time setup / rebuild of the read model.
   */
  async rebuild?(): Promise<void>;
}
