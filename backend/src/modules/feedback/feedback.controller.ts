// §20/§21/§33.2 — L8 Feedback & Learning REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { EvidenceTaxonomyService } from "./evidence-taxonomy.service";
import { ProviderReputationService } from "./provider-reputation.service";
import { ProviderStarvationWatchService } from "./starvation-watch.service";
import { CalibrationFeedbackService } from "./calibration-feedback.service";
import { UserEquilibriumGuardService } from "./user-equilibrium.service";
import { ReportedOutcome, FailureAdjudication } from "./types";

@Controller("feedback")
export class FeedbackController {
  constructor(
    private readonly evidence: EvidenceTaxonomyService,
    private readonly reputation: ProviderReputationService,
    private readonly starvation: ProviderStarvationWatchService,
    private readonly calibration: CalibrationFeedbackService,
    private readonly equilibrium: UserEquilibriumGuardService,
  ) {}

  // ── Evidence Taxonomy (§20) ──────────────────────────────

  @Post("evidence/record")
  recordOutcome(@Body() outcome: Omit<ReportedOutcome, "id">) {
    const result = this.evidence.validateAndRecord(outcome);
    if (!result.ok) return { recorded: false, error: result.error };
    return { recorded: true, outcome: result.value };
  }

  @Get("evidence/provider/:providerRef")
  providerOutcomes(@Param("providerRef") providerRef: string) {
    return this.evidence.getOutcomesForProvider(providerRef);
  }

  @Post("evidence/holdout")
  createHoldout(
    @Body() body: { holdoutFraction: number; metrics: string[]; fairnessGuarded?: boolean },
  ) {
    return this.evidence.createHoldout(
      body.holdoutFraction,
      body.metrics,
      body.fairnessGuarded,
    );
  }

  @Get("evidence/holdouts/active")
  activeHoldouts() {
    return this.evidence.getActiveHoldouts();
  }

  // ── Provider Reputation (§20.3) ──────────────────────────

  @Get("reputation")
  reputations() {
    return this.reputation.getAllReputations();
  }

  @Get("reputation/directed-flow-eligible")
  directedFlowEligible() {
    return this.reputation.getDirectedFlowEligible();
  }

  @Post("reputation/adjudicate")
  async adjudicate(
    @Body()
    body: {
      providerRef: string;
      platformInduced: boolean;
      rootCause: FailureAdjudication["rootCause"];
      confidence: number;
      evidenceRefs?: string[];
    },
  ) {
    const result = await this.reputation.adjudicateFailure(body.providerRef, {
      platformInduced: body.platformInduced,
      rootCause: body.rootCause,
      confidence: body.confidence,
      evidenceRefs: body.evidenceRefs ?? [],
    });
    if (!result.ok) return { adjudicated: false, error: result.error };
    return { adjudicated: true, result: result.value };
  }

  @Post("reputation/success")
  recordSuccess(@Body() body: { providerRef: string }) {
    this.reputation.recordSuccess(body.providerRef);
    return { recorded: true };
  }

  // ── Starvation Watch (§20.5) ─────────────────────────────

  @Post("starvation/concentration")
  async concentration(
    @Body() body: { zoneRef: string; providerFlowShares: Record<string, number> },
  ) {
    const index = this.starvation.computeConcentrationIndex(
      body.zoneRef,
      body.providerFlowShares,
    );
    await this.starvation.triggerExploration(body.zoneRef, index);
    return index;
  }

  @Post("starvation/simulate-exploration")
  simulateExploration(
    @Body() body: { providerShares: Record<string, number>; explorationBonus?: number },
  ) {
    return this.starvation.simulateWithExploration(
      body.providerShares,
      body.explorationBonus,
    );
  }

  // ── Calibration Feedback (§33.2) ─────────────────────────

  @Post("calibration/emit")
  async emitCalibration(
    @Body()
    body: {
      stratifiedMetrics: Record<string, { expected: number; observed: number }>;
      recommitSLAHitRate: number;
      gLevelDowngradeRate: number;
      escrowUtilization: number;
      avgDisputeResolutionMs: number;
      commitmentFulfillmentRate: number;
    },
  ) {
    return this.calibration.emitCalibrationFeedback(body);
  }

  @Get("calibration/latest")
  latestCalibration() {
    return this.calibration.getLatestMetrics();
  }

  @Post("calibration/assess")
  assessCalibration(
    @Body() body: { stratifiedMetrics: Record<string, { expected: number; observed: number }> },
  ) {
    return this.calibration.assessCalibration(body.stratifiedMetrics);
  }

  // ── User Equilibrium (§21.5) ─────────────────────────────

  @Post("equilibrium/evaluate")
  async evaluateEquilibrium(
    @Body() body: { soFlow: Record<string, number>; ueFlow: Record<string, number>; threshold?: number; zoneRef?: string },
  ) {
    const result = this.equilibrium.evaluate(body.soFlow, body.ueFlow, body.threshold);
    if (body.zoneRef) await this.equilibrium.emitGuardTrigger(body.zoneRef, result);
    return result;
  }

  @Post("equilibrium/mnl")
  mnl(@Body() body: { routeUtilities: Record<string, number>; totalDemand?: number }) {
    if (body.totalDemand !== undefined) {
      return this.equilibrium.computeUEFlow(body.routeUtilities, body.totalDemand);
    }
    return this.equilibrium.computeMNLProbabilities(body.routeUtilities);
  }
}
