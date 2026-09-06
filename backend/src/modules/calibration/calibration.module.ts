// §23 — Uncertainty, Confidence & Calibration module.
// Stratified reporting, minimum-observation power gates, and drift monitor
// on top of the prediction-layer CalibrationService.
import { Module } from "@nestjs/common";
import { PredictionModule } from "@modules/prediction/prediction.module";
import { CalibrationController } from "./calibration.controller";
import { CalibrationKFIService } from "./calibration-kpi.service";

@Module({
  imports: [PredictionModule],
  controllers: [CalibrationController],
  providers: [CalibrationKFIService],
  exports: [CalibrationKFIService],
})
export class CalibrationModule {}