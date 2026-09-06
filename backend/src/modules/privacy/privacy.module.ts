// §37 — Privacy & Ethics module.
// k≥50 per stratum + DP composition (§37.1), retention partition (§37.2),
// consent-gated orchestration with safe-exit (§37.3/§37.4).
import { Module } from "@nestjs/common";
import { PrivacyController } from "./privacy.controller";
import { PrivacyEthicsService } from "./privacy-ethics.service";

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyEthicsService],
  exports: [PrivacyEthicsService],
})
export class PrivacyModule {}