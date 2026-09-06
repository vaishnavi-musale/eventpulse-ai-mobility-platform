// §35 — DI graph validation: verifies the saga, reconciliation and mode
// services resolve via Nest DI with stubbed data repositories (no live infra).
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import Redis from "ioredis";
import {
  ReservationSaga,
  RESERVATION_SAGA,
  ReserveCommand,
} from "./reservation.saga";
import { ReservationIntent } from "./entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "./entities/reservation-ledger-entry.entity";
import { CapacityLedger } from "./entities/capacity-ledger.entity";
import { ReconciliationService } from "../resilience/reconciliation.service";
import { OperatingModeService } from "../resilience/operating-mode.service";
import {
  REDIS_CLIENT,
  REDIS_SAGA_CLIENT,
} from "../messaging/redis/redis-client.token";
import { EVENT_BUS } from "../messaging/event-bus.token";
import { EventBus } from "../messaging/event-bus.interface";

describe("Core DI graph (§35)", () => {
  const makeRepo = () =>
    ({
      findOneBy: jest.fn(async () => null),
      find: jest.fn(async () => []),
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => d),
      update: jest.fn(async () => ({ affected: 0 })),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn(() => ({
          where: jest.fn(() => ({
            getOne: jest.fn(async () => ({
              id: "unit-1",
              usableCapacity: 100,
              reserved: 0,
              verifiedInventory: true,
            })),
          })),
        })),
      })),
    }) as unknown as Repository<any>;

  const redis = {
    set: jest.fn(),
    eval: jest.fn(async () => 99),
    get: jest.fn(),
    exists: jest.fn(async () => 1),
  } as unknown as Redis;
  const eventBus: EventBus = {
    publish: jest.fn(async () => undefined),
    subscribe: jest.fn(() => () => undefined),
    shutdown: jest.fn(async () => undefined),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: any) =>
      fn({ getRepository: () => makeRepo() }),
    ),
  } as unknown as DataSource;

  it("resolves ReservationSaga, ReconciliationService and OperatingModeService", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: REDIS_SAGA_CLIENT, useValue: redis },
        { provide: EVENT_BUS, useValue: eventBus },
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(ReservationIntent),
          useValue: makeRepo(),
        },
        {
          provide: getRepositoryToken(ReservationLedgerEntry),
          useValue: makeRepo(),
        },
        { provide: getRepositoryToken(CapacityLedger), useValue: makeRepo() },
        ReservationSaga,
        ReconciliationService,
        OperatingModeService,
      ],
    }).compile();

    const saga = moduleRef.get(ReservationSaga);
    const reconciliation = moduleRef.get(ReconciliationService);
    const modes = moduleRef.get(OperatingModeService);

    expect(saga).toBeDefined();
    expect(reconciliation).toBeDefined();
    expect(modes).toBeDefined();
    expect(modes.decide().mode).toBe("NORMAL");
  });

  it("saga compiles and the RESERVATION_SAGA token maps to the class", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: REDIS_SAGA_CLIENT, useValue: redis },
        { provide: EVENT_BUS, useValue: eventBus },
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(ReservationIntent),
          useValue: makeRepo(),
        },
        {
          provide: getRepositoryToken(ReservationLedgerEntry),
          useValue: makeRepo(),
        },
        { provide: getRepositoryToken(CapacityLedger), useValue: makeRepo() },
        ReservationSaga,
        { provide: RESERVATION_SAGA, useClass: ReservationSaga },
      ],
    }).compile();

    const viaToken = moduleRef.get(RESERVATION_SAGA);
    const reserve: ReserveCommand = {
      capacityUnitRef: "unit-1",
      quantity: 1,
      gLevel: "G2",
      attendeeRef: "attendee-1",
      idempotencyKey: "boot-1",
      timeWindowStart: new Date(),
      timeWindowEnd: new Date(),
    };
    const result = await viaToken.reserve(reserve);
    expect(result.ok).toBe(true);
  });
});
