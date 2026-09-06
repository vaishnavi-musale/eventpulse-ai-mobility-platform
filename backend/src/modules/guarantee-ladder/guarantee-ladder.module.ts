// §6/§44 — Guarantee Ladder module
import { Module } from "@nestjs/common";
import { GuaranteeLadderController } from "./guarantee-ladder.controller";
import { GuaranteeLadderService } from "./guarantee-ladder.service";

@Module({
  controllers: [GuaranteeLadderController],
  providers: [GuaranteeLadderService],
  exports: [GuaranteeLadderService],
})
export class GuaranteeLadderModule {}
