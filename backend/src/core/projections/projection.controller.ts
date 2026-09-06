// §35 — Read-model query endpoints (CQRS side effect: ops observability).
import { Controller, Get, Param } from "@nestjs/common";
import { CommitmentProjectionConsumer } from "./commitment-projection.consumer";

@Controller("projections")
export class ProjectionController {
  constructor(private readonly projection: CommitmentProjectionConsumer) {}

  @Get("tokens/active")
  activeTokens() {
    return { count: this.projection.getActiveTokens().length, tokens: this.projection.getActiveTokens() };
  }

  @Get("tokens/:tokenId")
  token(@Param("tokenId") tokenId: string) {
    const row = this.projection.getToken(tokenId);
    return row ? { found: true, token: row } : { found: false };
  }

  @Get("tokens/state/:state")
  tokensByState(@Param("state") state: string) {
    return { tokenIds: this.projection.getTokensByState(state).map((t) => t.tokenId) };
  }

  @Get("zones/:zoneRef")
  zone(@Param("zoneRef") zoneRef: string) {
    const z = this.projection.getZone(zoneRef);
    return z ? { found: true, zone: z } : { found: false };
  }
}