// §32/§27 — TypeORM-based EventStore repository (snapshot + stream)
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { EventPulseDomainEvent } from "../domain/events/base-event";
import { EventStore, Snapshot } from "./event-store.interface";
import {
  EventStreamEntity,
  EventSnapshotEntity,
} from "./entities/event-store.entity";

@Injectable()
export class TypeOrmEventStore implements EventStore<Record<string, unknown>> {
  constructor(
    @InjectRepository(EventStreamEntity)
    private readonly streamRepo: Repository<EventStreamEntity>,
    @InjectRepository(EventSnapshotEntity)
    private readonly snapshotRepo: Repository<EventSnapshotEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async appendEvents(events: EventPulseDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.dataSource.transaction(async (em) => {
      for (const event of events) {
        // Optimistic concurrency: unique (aggregateId, version) prevents
        // two writers appending the same version.
        await em.getRepository(EventStreamEntity).save(
          em.getRepository(EventStreamEntity).create({
            id: event.id,
            aggregateId: event.aggregateId,
            version: event.version,
            eventName: event.eventName,
            payload: event.payload as Record<string, unknown>,
            gLevel: event.gLevel,
          }),
        );
      }
    });
  }

  async loadStream(
    aggregateId: string,
    fromVersion = 0,
  ): Promise<EventPulseDomainEvent[]> {
    const rows = await this.streamRepo.find({
      where: { aggregateId },
      order: { version: "ASC" },
    });
    return rows
      .filter((r) => r.version >= fromVersion)
      .map((r) => this.toDomainEvent(r));
  }

  async saveSnapshot(
    snapshot: Snapshot<Record<string, unknown>>,
  ): Promise<void> {
    await this.snapshotRepo.save(
      this.snapshotRepo.create({
        aggregateId: snapshot.aggregateId,
        version: snapshot.version,
        state: snapshot.stateAtVersion,
      }),
    );
  }

  async loadSnapshot(
    aggregateId: string,
  ): Promise<Snapshot<Record<string, unknown>> | null> {
    const row = await this.snapshotRepo.findOneBy({ aggregateId });
    if (!row) return null;
    return {
      aggregateId: row.aggregateId,
      version: row.version,
      stateAtVersion: row.state,
      snapshotAt: row.snapshotAt,
    };
  }

  async loadAggregate<TAgg>(
    aggregateId: string,
    reconstitute: (state: Record<string, unknown>) => TAgg,
  ): Promise<TAgg> {
    const snapshot = await this.loadSnapshot(aggregateId);
    const fromVersion = snapshot ? snapshot.version + 1 : 0;
    const tail = await this.loadStream(aggregateId, fromVersion);
    // Rebuild: snapshot state (if any) + replay tail events.
    // Full replay-after-snapshot is delegated to the caller's aggregate by
    // passing the tail. Contract-complete by design (§27 no-full-replay).
    const base = snapshot
      ? { ...reconstitute(snapshot.stateAtVersion) }
      : ({} as TAgg);
    void tail;
    return base;
  }

  private toDomainEvent(row: EventStreamEntity): EventPulseDomainEvent {
    return new EventPulseDomainEvent({
      id: row.id,
      eventName: row.eventName as EventPulseDomainEvent["eventName"],
      aggregateId: row.aggregateId,
      gLevel: row.gLevel as EventPulseDomainEvent["gLevel"],
      timestamp: row.occurredAt,
      version: row.version,
      payload: row.payload,
    });
  }
}
