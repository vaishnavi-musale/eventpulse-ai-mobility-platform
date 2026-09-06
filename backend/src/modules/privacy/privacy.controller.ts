// §37 — Privacy & Ethics REST API.
import { Body, Controller, Get, Post } from "@nestjs/common";
import {
  PrivacyEthicsService,
  PrivacyStratumKey,
  RetentionClass,
  K_ANON,
  EPSILON_BUDGET_PER_STRATUM,
} from "./privacy-ethics.service";

@Controller("privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyEthicsService) {}

  @Get("k-anonymity")
  kAnonymity() {
    return { k: K_ANON, epsilonBudget: EPSILON_BUDGET_PER_STRATUM };
  }

  @Post("release/check")
  checkRelease(
    @Body()
    body: { stratum: PrivacyStratumKey; cellCounts: number[]; epsilonPerRelease?: number },
  ) {
    return this.privacy.checkRelease(
      body.stratum,
      body.cellCounts,
      body.epsilonPerRelease,
    );
  }

  @Post("release/composition")
  compositionStatus(@Body() body: { stratum: PrivacyStratumKey }) {
    return this.privacy.compositionStatus(body.stratum);
  }

  @Get("retention")
  retentionPolicies() {
    return this.privacy.getRetentionPolicies();
  }

  @Post("retention/purge")
  schedulePurge(
    @Body() body: { rawRef: string; cls: RetentionClass; observedAt: string },
  ) {
    return this.privacy.schedulePurge(body.rawRef, body.cls, new Date(body.observedAt));
  }

  @Get("retention/pending-purges")
  pendingPurges() {
    return { pending: this.privacy.pendingPurges() };
  }

  @Post("consent/check")
  checkConsent(
    @Body() body: { attendeeRef: string; consented: boolean; inManagedFlow: boolean },
  ) {
    return this.privacy.checkConsent(
      body.attendeeRef,
      body.consented,
      body.inManagedFlow,
    );
  }

  @Post("consent/safe-exit")
  safeExit(
    @Body() body: { attendeeRef: string; zoneRef: string; destinationRef: string },
  ) {
    return this.privacy.safeExitPath(
      body.attendeeRef,
      body.zoneRef,
      body.destinationRef,
    );
  }
}
