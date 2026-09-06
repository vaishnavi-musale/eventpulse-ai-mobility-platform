// §25 — Commitment & Delivery Engine module
import { Module } from "@nestjs/common";
import { CommitmentDeliveryController } from "./commitment-delivery.controller";
import { CommitmentDeliveryService } from "./commitment-delivery.service";

@Module({
  controllers: [CommitmentDeliveryController],
  providers: [CommitmentDeliveryService],
  exports: [CommitmentDeliveryService],
})
export class CommitmentDeliveryModule {}
