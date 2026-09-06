// §13 — L2 State Estimation REST API.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { StateEstimationService } from "./state-estimation.service";
import {
  FusionService,
  SourceReading,
  CommitmentPrior,
} from "./fusion.service";
import { OperationalIndependenceService } from "./operational-independence";

@Controller("state")
export class StateEstimationController {
  constructor(
    private readonly state: StateEstimationService,
    private readonly fusion: FusionService,
    private readonly independence: OperationalIndependenceService,
  ) {}

  @Get("zones/:zone")
  getState(@Param("zone") zone: string) {
    const s = this.state.getState(zone);
    if (!s) return { found: false };
    return { found: true, state: s };
  }

  @Post("fuse/:zone")
  async fuseAndUpdate(
    @Param("zone") zone: string,
    @Body()
    body: {
      readings: SourceReading[];
      usableCapacity: number;
      prior?: CommitmentPrior | null;
      density?: number;
    },
  ) {
    const result = await this.state.fuseAndUpdate(
      zone,
      body.readings,
      body.usableCapacity,
      body.prior ?? null,
      body.density,
    );
    return result;
  }

  @Post("fusion/:zone")
  async fuseOnly(
    @Param("zone") zone: string,
    @Body() body: { readings: SourceReading[]; prior?: CommitmentPrior | null },
  ) {
    return this.fusion.fuse(zone, body.readings, body.prior ?? null);
  }

  @Post("independence/check")
  checkIndependence(
    @Body()
    body: {
      sourceA: { id: string; modality: string; upstreamDependency?: string };
      sourceB: { id: string; modality: string; upstreamDependency?: string };
      residualCorrelation: number;
    },
  ) {
    return this.independence.areIndependent(
      body.sourceA,
      body.sourceB,
      body.residualCorrelation,
    );
  }
}
