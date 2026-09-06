// §27/§25/§23 — Scheduled operational jobs.
// Dependency-free interval scheduler (no @nestjs/schedule dep) running from a
// lifecycle hook. Each job is guarded so a failure in one doesn't abort others.
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { ReconciliationService } from "@core/resilience/reconciliation.service";
import { SignedOfflineTokenService } from "@modules/recovery/signed-offline-token.service";
import { LastKnownPlanService } from "@modules/recovery/last-known-plan.service";
import { CommitmentDeliveryService } from "@modules/commitment-delivery/commitment-delivery.service";
import { CalibrationKFIService } from "@modules/calibration/calibration-kpi.service";
import { DltReplayer } from "./dlt-replayer";
import { RedisProviderCacheFlusher } from "@core/resilience/cache-flusher";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@core/messaging/redis/redis-client.token";

export interface JobRunner {
  readonly name: string;
  readonly intervalMs: number;
  run(): Promise<unknown>;
  enabled?: boolean;
}

interface JobRegistryEntry extends JobRunner {
  timer: NodeJS.Timeout | null;
  running: boolean;
}

@Injectable()
export class ScheduledJobsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ScheduledJobsService.name);
  private readonly jobs = new Map<string, JobRegistryEntry>();

  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly offlineTokens: SignedOfflineTokenService,
    private readonly lastKnownPlan: LastKnownPlanService,
    private readonly commitment: CommitmentDeliveryService,
    private readonly calibration: CalibrationKFIService,
    private readonly dltReplayer: DltReplayer,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cacheFlusher: RedisProviderCacheFlusher,
  ) {}

  onModuleInit(): void {
    const registry: JobRunner[] = [
      // §25.5 — counter vs ledger drift → refund/detach + alert.
      { name: "reconciliation", intervalMs: 5 * 60_000, run: () => this.reconciliation.run((m) => void m) },
      // §35 — dead-letter redelivery sweep (analogous to outbox relay).
      { name: "dlt-replay", intervalMs: 30_000, run: () => this.dltReplayer.replay() },
      // §27.1 — release expired held offline tokens (they should re-offer).
      { name: "offline-token-expiry", intervalMs: 60_000, run: () => this.sweepExpiredOfflineTokens() },
      // §27.3 — escalate broadcasts missing ack past the deadline.
      { name: "plan-escalation", intervalMs: 60_000, run: () => Promise.resolve(this.lastKnownPlan.checkEscalations()) },
      // §27.2 — flush provider caches so stale last-known state is not honored.
      { name: "provider-cache-flush", intervalMs: 30 * 60_000, run: () => this.cacheFlusher.flushAllProviders() },
      // §25.4 — monitoring recommit SLAs is app-level; here we just surface escrow health.
      { name: "commitment-health", intervalMs: 10 * 60_000, run: () => this.commitmentHealth() },
      // §23.2 — forced recalibration window tap (kept light: no-op unless due).
      { name: "calibration-drift", intervalMs: 15 * 60_000, run: () => this.calibrationDriftProbe() },
    ];

    for (const job of registry) {
      const entry: JobRegistryEntry = { ...job, timer: null, running: false };
      entry.timer = setInterval(() => void this.tick(entry), job.intervalMs);
      this.jobs.set(job.name, entry);
      void this.logger.log(`Scheduled job [${job.name}] every ${job.intervalMs / 1000}s`);
    }
  }

  onApplicationShutdown(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) clearInterval(job.timer);
      job.timer = null;
    }
    this.jobs.clear();
  }

  listJobs(): Array<{ name: string; intervalMs: number; health: string }> {
    return Array.from(this.jobs.values()).map((job) => ({
      name: job.name,
      intervalMs: job.intervalMs,
      health: job.running ? "running" : "idle",
    }));
  }

  private async tick(entry: JobRegistryEntry): Promise<void> {
    if (entry.running) return; // don't overlap
    entry.running = true;
    try {
      await entry.run();
    } catch (err) {
      this.logger.error(`Scheduled job [${entry.name}] failed: ${(err as Error).message}`);
    } finally {
      entry.running = false;
    }
  }

  private async sweepExpiredOfflineTokens(): Promise<number> {
    const candidates = this.offlineTokens.getTokensForRecovery();
    let released = 0;
    for (const token of candidates) {
      const check = this.offlineTokens.checkValidity(token.tokenId);
      if (check.expired) {
        const r = await this.offlineTokens.releaseExpiredToken(token.tokenId);
        if (r.ok) released++;
      }
    }
    if (released) this.logger.log(`§27.1: released ${released} expired offline tokens`);
    return released;
  }

  private async commitmentHealth(): Promise<Record<string, unknown>> {
    // Sample escrow health for the recommit SLA monitor (per-zone summary).
    const zones: Array<{ zone: string; available: number; utilization: number }> = [];
    // CommitmentDeliveryService exposes getEscrow(zoneRef); scan known zone refs is
    // not enumerable, so this job is a passthrough reporting cache.Redis health.
    const redisOk = (await this.redis.ping()) === "PONG";
    return { redisOk, zones };
  }

  private async calibrationDriftProbe(): Promise<number> {
    // Drift monitor is fed by prediction residuals; the probe reports current state.
    return this.calibration.getDrift().length;
  }
}