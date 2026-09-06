// §15/§16/§23 — L4 Prediction module (forecast hierarchy, weather, calibration,
// anomaly-detection cross-cutting filter).
import { Module } from "@nestjs/common";
import { PredictionController } from "./prediction.controller";
import { ForecastService } from "./forecast.service";
import { CalibrationService } from "./calibration.service";
import { WeatherService } from "./weather.service";
import { AnomalyDetectionService } from "./anomaly-detection.service";
import { forecastWithFallback, FORECAST_MODELS } from "./forecast-models";

@Module({
  controllers: [PredictionController],
  providers: [
    ForecastService,
    CalibrationService,
    WeatherService,
    AnomalyDetectionService,
    { provide: "FORECAST_MODELS", useValue: FORECAST_MODELS },
    { provide: "FORECAST_FN", useValue: forecastWithFallback },
  ],
  exports: [
    ForecastService,
    CalibrationService,
    WeatherService,
    AnomalyDetectionService,
  ],
})
export class PredictionModule {}
