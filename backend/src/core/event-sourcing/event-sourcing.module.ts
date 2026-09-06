// §35 — EventSourcing module: EventStore repository + entities
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EventStreamEntity,
  EventSnapshotEntity,
} from "./entities/event-store.entity";
import { TypeOrmEventStore } from "./typeorm-event.store";
import { EVENT_STORE } from "./event-store.token";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EventStreamEntity, EventSnapshotEntity])],
  providers: [{ provide: EVENT_STORE, useClass: TypeOrmEventStore }],
  exports: [EVENT_STORE],
})
export class EventSourcingModule {}
