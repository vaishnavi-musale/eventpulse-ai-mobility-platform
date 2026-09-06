// §32 — Base aggregate root with apply/uncommittedEvents
import { EventPulseDomainEvent } from "../domain/events/base-event";

/**
 * §32 — Event-sourced aggregate root base.
 * Applying a domain event mutates state and appends to uncommittedEvents,
 * which persist to the EventStore before being cleared.
 */
export abstract class AggregateRoot {
  protected _id: string = "";
  protected _version = 0;
  private readonly _uncommittedEvents: EventPulseDomainEvent[] = [];

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  get uncommittedEvents(): readonly EventPulseDomainEvent[] {
    return this._uncommittedEvents;
  }

  /**
   * Apply an event: mutate state via the type-specific handler, then track
   * it as uncommitted. Optionally persist without tracking (for replay).
   */
  protected apply<T>(
    event: EventPulseDomainEvent<T>,
    track: boolean = true,
  ): void {
    const handler = (this as unknown as Record<string, unknown>)[
      this.handlerName(event.eventName)
    ];
    if (handler && typeof handler === "function") {
      (handler as (e: EventPulseDomainEvent<T>) => void).call(this, event);
    }
    this._version = event.version;
    if (track) this._uncommittedEvents.push(event);
  }

  /**
   * Rebuild state from a stream of historical events (replay) — no tracking.
   */
  protected replay<T>(events: Iterable<EventPulseDomainEvent<T>>): void {
    for (const event of events) {
      this.apply(event, false);
    }
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents.length = 0;
  }

  private handlerName(eventName: string): string {
    // Event names are PascalCase (e.g. "TokenOffered"); the handler method
    // mirrors the exact case ("onTokenOffered"). Only prepend "on" and
    // preserve the original capitalization.
    return `on${eventName}`;
  }
}
