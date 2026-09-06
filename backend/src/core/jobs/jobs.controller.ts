// §35 — Operational endpoints for scheduled jobs & DLT observability.
import { Controller, Get, Post } from "@nestjs/common";
import { ScheduledJobsService } from "./scheduled-jobs.service";
import { DltReplayer } from "./dlt-replayer";

@Controller("ops")
export class JobsController {
  constructor(
    private readonly jobs: ScheduledJobsService,
    private readonly dlt: DltReplayer,
  ) {}

  @Get("jobs")
  listJobs() {
    return this.jobs.listJobs();
  }

  @Post("dlt/replay")
  async replayDlt() {
    const report = await this.dlt.replay();
    return { ok: true, report };
  }
}