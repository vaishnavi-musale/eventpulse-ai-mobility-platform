// §23 — Uncertainty, Confidence & Calibration REST API.
import { Body, Controller, Get, Post } from "@nestjs/common";
import { CalibrationKFIService, StratumCoverageReport } from "./calibration-kpi.service";
import { StratumKey } from "@modules/prediction/calibration.service";

@Controller("calibration")
export class CalibrationController {
  constructor(private readonly kpi: CalibrationKFIService) {}

  @Get("power-gate")
  powerGate() {
    return { minimalObservations: this.kpi.minimalObservations() };
  }

  @Post("coverage")
  coverage(@Body() body: { stratum: StratumKey }): StratumCoverageReport {
    return this.kpi.coverageFor(body.stratum);
  }

  @Post("can-state")
  canMakeConfidentStatement(@Body() body: { stratum: StratumKey }) {
    return this.kpi.canMakeConfidentStatement(body.stratum);
  }

  @Post("drift/record")
  recordDrift(
    @Body() body: { horizon: number; zone: string; residual: number },
  ) {
    return this.kpi.recordDrift(body.horizon, body.zone, body.residual);
  }

  @Get("drift")
  drift() {
    return this.kpi.getDrift();
  }

  @Post("recalibrate")
  recalibrate() {
    this.kpi.recalibrate();
    return { recalibrated: true };
  }
}
