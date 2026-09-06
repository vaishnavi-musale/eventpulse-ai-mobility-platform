// §35 — Output event serializer (JSON payload with envelope)
import { EventPulseDomainEvent } from "../domain/events/base-event";

export function serializeEvent<T>(event: EventPulseDomainEvent<T>): string {
  return JSON.stringify(event.toJSON());
}

export function deserializeEvent<T>(raw: string): EventPulseDomainEvent<T> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return new EventPulseDomainEvent<T>({
    id: parsed.id as string,
    eventName: parsed.eventName as EventPulseDomainEvent<T>["eventName"],
    aggregateId: parsed.aggregateId as string,
    gLevel: parsed.gLevel as EventPulseDomainEvent<T>["gLevel"],
    timestamp: new Date(parsed.timestamp as string),
    version: parsed.version as number,
    payload: parsed.payload as T,
  });
}
