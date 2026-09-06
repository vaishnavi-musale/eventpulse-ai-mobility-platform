// §32/§27 — Event store snapshot + stream
import { EventPulseDomainEvent } from "../domain/events/base-event";

export interface EventStreamEntry {
  aggregateId: string;
  version: number;
  event: EventPulseDomainEvent;
}

export interface Snapshot<T = unknown> {
  aggregateId: string;
  version: number;
  stateAtVersion: T;
  snapshotAt: Date;
}

/**
 * §32/§27 — EventStore repository: append stream, load aggregate, snapshot.
 * Snapshotting avoids full-replay dependency (§27).
 */
export interface EventStore<TState = unknown> {
  /**
   * Persist a batch of uncommitted events for an aggregate atomically.
   * Implementations must reject appends whose version collides (optimistic concurrency).
   */
  appendEvents(events: EventPulseDomainEvent[]): Promise<void>;

  /**
   * Load the full event stream for an aggregate (or since a snapshot).
   */
  loadStream(
    aggregateId: string,
    fromVersion?: number,
  ): Promise<EventPulseDomainEvent[]>;

  /**
   * Persist a snapshot at a given aggregate version.
   */
  saveSnapshot(snapshot: Snapshot<TState>): Promise<void>;

  /**
   * Load the latest snapshot for an aggregate, if any.
   */
  loadSnapshot(aggregateId: string): Promise<Snapshot<TState> | null>;

  /**
   * Rebuild an aggregate from snapshot (preferred) + subsequent stream.
   * This is the §27 "no full-replay dependency" entry point.
   */
  loadAggregate<TAgg>(
    aggregateId: string,
    reconstitute: (state: TState) => TAgg,
  ): Promise<TAgg>;

  /**
   * Read-model/projection hook — a projection may subscribe to appended events.
   */
  onEvents?(handler: (events: EventPulseDomainEvent[]) => void): void;
}
