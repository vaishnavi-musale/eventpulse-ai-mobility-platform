// §6/§44 — Guarantee Ladder REST API.
import { Body, Controller, Get, Post } from "@nestjs/common";
import { GuaranteeLadderService } from "./guarantee-ladder.service";
import { GLevel, G_LADDER_INDEX, G_LEVEL_LABELS } from "@core/domain/g-level.enum";
import { GLinkStatus } from "./types";
import { OperatingMode } from "@core/domain/operating-mode.enum";

@Controller("guarantee")
export class GuaranteeLadderController {
  constructor(private readonly ladder: GuaranteeLadderService) {}

  @Get("levels")
  levels() {
    return (Object.entries(G_LEVEL_LABELS) as [GLevel, string][]).map(
      ([level, label]) => ({ level, index: G_LADDER_INDEX[level], label }),
    );
  }

  @Post("compute")
  compute(@Body() body: { requestedLevel: GLevel; links: GLinkStatus }) {
    return this.ladder.computeGLevel(body);
  }

  @Post("issuance")
  computeAtIssuance(
    @Body()
    body: {
      requestedLevel: GLevel;
      links: GLinkStatus;
      avgGLevel: number;
      channelConfirmable: boolean;
    },
  ) {
    return this.ladder.computeAtIssuance(
      body.requestedLevel,
      body.links,
      body.avgGLevel,
      body.channelConfirmable,
    );
  }

  @Post("transition")
  async transition(
    @Body()
    body: {
      tokenId: string;
      currentLevel: GLevel;
      links: GLinkStatus;
      previousVersion: number;
    },
  ) {
    return this.ladder.evaluateTransition(
      body.tokenId,
      body.currentLevel,
      body.links,
      body.previousVersion,
    );
  }

  @Post("forbids/check")
  checkForbids(
    @Body()
    body: {
      gLevel: GLevel;
      inventoryVerified: boolean;
      channelConfirmable: boolean;
      avgGLevel: number;
      labeledAsManaged: boolean;
    },
  ) {
    return this.ladder.enforceForbids(body);
  }

  @Post("mode-coupling")
  modeCoupling(
    @Body()
    body: { currentMode: OperatingMode; requestedLevel: GLevel },
  ) {
    return this.ladder.enforceModeCoupling(
      body.currentMode,
      body.requestedLevel,
    );
  }
}
