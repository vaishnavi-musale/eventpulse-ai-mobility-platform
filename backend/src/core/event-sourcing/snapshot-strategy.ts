// §32/§27 — Snapshotting strategy: when to snapshot and what it captures
export interface SnapshotStrategy {
  /**
   * Given the current version and number of events since the last snapshot,
   * decide whether to take a new snapshot now.
   */
  shouldSnapshot(
    aggregateId: string,
    version: number,
    eventsSinceSnapshot: number,
  ): boolean;
}

/**
 * §27 — Snapshot every N events to bound replay cost.
 */
export class ThresholdSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly threshold: number = 100) {}

  shouldSnapshot(
    _aggregateId: string,
    _version: number,
    eventsSinceSnapshot: number,
  ): boolean {
    return eventsSinceSnapshot >= this.threshold;
  }
}

/**
 * §27 — Snapshot on a time cadence (e.g. every 5 minutes).
 */
export class TimeBasedSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly intervalMs: number = 5 * 60_000) {}

  shouldSnapshot(
    _aggregateId: string,
    _version: number,
    _eventsSinceSnapshot: number,
  ): boolean {
    return true;
  }
}
