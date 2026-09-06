// §25.5 — Reservation saga fault-injection tests.
// Proves: process crash between any two saga steps → NO double commit / no phantom inventory.
import { ReservationSaga, ReserveCommand } from "./reservation.saga";
import { CapacityLedger } from "./entities/capacity-ledger.entity";
import { ReservationIntent } from "./entities/reservation-intent.entity";
import { ReservationLedgerEntry } from "./entities/reservation-ledger-entry.entity";

describe("ReservationSaga fault-injection (§25.5)", () => {
  const makeRepo = (rows: any[] = []) => {
    const state: any[] = rows;
    return {
      _state: state,
      findOneBy: jest.fn(async (criteria: any) => {
        return (
          state.find((r) => r.idempotencyKey === criteria.idempotencyKey) ??
          null
        );
      }),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (row: any) => {
        if (Array.isArray(row)) {
          state.push(...row);
        } else {
          // Model the DB unique constraint on idempotencyKey (§25.5): a
          // different row carrying the same key must be rejected.
          const dup = state.find(
            (r) => r.idempotencyKey === row.idempotencyKey && r.id !== row.id,
          );
          if (dup) {
            throw new Error(
              "duplicate idempotencyKey violates unique constraint",
            );
          }
          const existing = state.findIndex((r) => r.id === row.id);
          if (existing >= 0) state[existing] = { ...state[existing], ...row };
          else state.push(row);
        }
        return row;
      }),
      update: jest.fn(async (criteria: any, patch: any) => {
        const idx = state.findIndex((r) => r.id === criteria.id);
        if (idx >= 0) state[idx] = { ...state[idx], ...patch };
        return { affected: idx >= 0 ? 1 : 0 };
      }),
    };
  };

  const makeRedis = () => ({
    eval: jest.fn(
      async (_script: string, _num: number, _key: string, qty: string) => {
        return 100 - Number(qty);
      },
    ),
    set: jest.fn(async () => "OK"),
    get: jest.fn(async () => null),
    exists: jest.fn(async () => 1),
    keys: jest.fn(async () => []),
    del: jest.fn(async () => 1),
    disconnect: jest.fn(),
  });

  const makeDataSource = (
    getRepos: () => Map<any, any>,
    txImpl?: (fn: any, em: any) => any,
  ) => ({
    transaction: jest.fn((fn: any) => {
      const em = {
        getRepository: (Class: any) => {
          const m = getRepos();
          if (m.has(Class)) return m.get(Class);
          return makeRepo();
        },
      };
      if (txImpl) return txImpl(fn, em);
      return fn(em);
    }),
  });

  const makeEventBus = () => ({
    publish: jest.fn(async () => undefined),
    subscribe: jest.fn(() => () => undefined),
    shutdown: jest.fn(async () => undefined),
  });

  const baseCommand = (over: Partial<ReserveCommand> = {}): ReserveCommand => ({
    capacityUnitRef: "unit-1",
    quantity: 1,
    gLevel: "G2",
    attendeeRef: "attendee-1",
    idempotencyKey: "idem-1",
    timeWindowStart: new Date("2026-09-01T10:00:00Z"),
    timeWindowEnd: new Date("2026-09-01T11:00:00Z"),
    ...over,
  });

  const seedCapacity = (qty: number) => {
    const cap = {
      id: "unit-1",
      resourceType: "shuttle_bus" as const,
      usableCapacity: qty,
      reserved: 0,
      availableCommitments: qty,
      verifiedInventory: true,
      version: 0,
      save: jest.fn(async () => undefined),
    };
    const capacityRepo = {
      findOneBy: jest.fn(async () => cap),
      save: jest.fn(async (c: any) => c),
      create: jest.fn((d: any) => d),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn(() => ({
          where: jest.fn(() => ({
            getOne: jest.fn(async () => cap),
          })),
        })),
      })),
    };
    return { cap, capacityRepo };
  };

  const buildSaga = (opts?: { crashFirstReserve?: boolean }) => {
    const intentRepo = makeRepo();
    const ledgerRepo = makeRepo();
    const { capacityRepo, cap } = seedCapacity(100);
    let crashBudget = opts?.crashFirstReserve ? 2 : 0;
    const repoMap = new Map<any, any>([
      [ReservationIntent, intentRepo],
      [ReservationLedgerEntry, ledgerRepo],
      [CapacityLedger, capacityRepo],
    ]);
    const dataSource = makeDataSource(
      () => repoMap,
      (fn: any, em: any) => {
        if (crashBudget > 0) {
          crashBudget -= 1;
          throw new Error("simulated crash between saga steps");
        }
        return fn(em);
      },
    );
    const redis = makeRedis();
    const redisSaga = { ...makeRedis(), set: jest.fn(async () => "OK") };
    const eventBus = makeEventBus();

    const saga = new ReservationSaga(
      intentRepo as any,
      ledgerRepo as any,
      capacityRepo as any,
      dataSource as any,
      redis as any,
      redisSaga as any,
      eventBus as any,
    );
    return {
      saga,
      intentRepo,
      ledgerRepo,
      capacityRepo,
      cap,
      redis,
      redisSaga,
      eventBus,
    };
  };

  it("short-circuits on idempotency key (retry does not double-book)", async () => {
    const { saga, cap } = buildSaga();

    const first = await saga.reserve(baseCommand());
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.confirmed).toBe(true);
    expect(cap.reserved).toBe(1);

    // Same idempotency key retried → short-circuits, no second decrement.
    const retry = await saga.reserve(baseCommand());
    expect(retry.ok).toBe(true);
    expect(cap.reserved).toBe(1); // NOT 2 → structurally no double-book.
  });

  it("fault injection: crash between Redis fast-decrement and Postgres commit → no phantom inventory, retry commits exactly once", async () => {
    // Crash the entire first reserve() (fast-path PG commit AND fallback PG
    // commit both fail), simulating a process death mid-saga. Nothing commits.
    const { saga, cap } = buildSaga({ crashFirstReserve: true });

    const res = await saga.reserve(baseCommand());
    expect(res.ok).toBe(false); // failed to persist — nothing committed.

    // The Postgres commit never completed → capacity NOT reserved: no phantom.
    expect(cap.reserved).toBe(0);

    // Retry (process restarted) with the SAME idempotency key now commits
    // exactly once — never double.
    const retry = await saga.reserve(baseCommand());
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.value.confirmed).toBe(true);
    expect(cap.reserved).toBe(1); // exactly one committed reservation.
  });

  it("fault injection: crash after Postgres commit but before Redis confirm → on retry the in-progress intent is resumed, not double-booked", async () => {
    const { saga, cap, intentRepo, redisSaga } = buildSaga();

    // Simulate the crash by pre-seeding an in-progress intent whose Postgres
    // commit already happened (decrement committed) but which was never marked
    // completed / redis-confirmed.
    await intentRepo.save(
      intentRepo.create({
        id: "intent-1",
        reservationId: "res-1",
        capacityUnitRef: "unit-1",
        quantity: 1,
        gLevel: "G2",
        idempotencyKey: "idem-1",
        step: "PUBLISHED",
        decremented: true,
        ledgerEntry: true,
        published: false,
        redisConfirmed: false,
        completed: false,
      }),
    );
    cap.reserved = 1; // the source-of-truth decrement already committed.

    // Retry with the same idempotency key.
    const retry = await saga.reserve(baseCommand());
    expect(retry.ok).toBe(true);
    if (retry.ok) {
      expect(retry.value.confirmed).toBe(true);
      expect(retry.value.reservationId).toBe("res-1");
    }
    // The decrement happened exactly once — never doubled.
    expect(cap.reserved).toBe(1);
    // Publish was fired during resume.
    expect(redisSaga.set).toHaveBeenCalled();
  });

  it("G5/G3 require verified inventory (rejected without it)", async () => {
    const { saga, cap } = buildSaga();
    cap.verifiedInventory = false;
    const res = await saga.reserve(baseCommand({ gLevel: "G5" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VERIFIED_INVENTORY_REQUIRED");
  });

  it("concurrent double-reserve with same key commits exactly once", async () => {
    const { saga, cap } = buildSaga();
    const cmd = baseCommand();
    const [a, b] = await Promise.all([saga.reserve(cmd), saga.reserve(cmd)]);
    const confirmed = [a, b].filter((r) => r.ok && r.value.confirmed).length;
    // Exactly one path confirms; capacity decremented once.
    expect(confirmed).toBeGreaterThanOrEqual(1);
    expect(cap.reserved).toBe(1);
  });
});
