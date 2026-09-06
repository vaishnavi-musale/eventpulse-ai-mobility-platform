// §15/§23 — L4 Prediction REST API.
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ForecastService } from "./forecast.service";
import { ForecastInput } from "./forecast-models";
import { WeatherService } from "./weather.service";
import { CalibrationService, StratumKey } from "./calibration.service";
import { AnomalyDetectionService, AnomalyMethod } from "./anomaly-detection.service";

@Controller("prediction")
export class PredictionController {
  constructor(
    private readonly forecast: ForecastService,
    private readonly weather: WeatherService,
    private readonly calibration: CalibrationService,
    private readonly anomaly: AnomalyDetectionService,
  ) {}

  @Post("forecast")
  async generateForecast(@Body() input: ForecastInput) {
    return this.forecast.forecast(input);
  }

  @Post("forecast/observation")
  recordObservation(
    @Body() body: { zone: string; eventClass: string; actual: number },
  ) {
    this.forecast.recordObservation(body.zone, body.eventClass, body.actual);
    return { recorded: true };
  }

  @Post("forecast/drift")
  detectDrift(
    @Body() body: { zone: string; residual: number },
  ): { driftDetected: boolean } {
    return { driftDetected: this.forecast.detectDrift(body.zone, body.residual) };
  }

  @Get("weather")
  async getWeather() {
    await this.weather.refresh();
    return this.weather.getConditions();
  }

  @Post("weather")
  setWeather(
    @Body()
    body: {
      precipitationMm: number;
      isRain: boolean;
      source: string;
    },
  ) {
    this.weather.setConditions(body);
    return { updated: true };
  }

  @Post("calibration/record")
  recordCalibration(
    @Body() body: { stratum: StratumKey; abnormal: boolean; predicted: number; ciLower: number; ciUpper: number; actual: number },
  ) {
    this.calibration.record({ ...body });
    return { recorded: true };
  }

  @Post("calibration/rate")
  calibrationRate(@Body() body: { stratum: StratumKey }) {
    return this.calibration.rate(body.stratum);
  }

  @Post("anomaly/evaluate")
  evaluateAnomaly(
    @Body() body: { zone: string; x: number; history: number[]; method?: AnomalyMethod },
  ) {
    const result = this.anomaly.evaluate(
      body.zone,
      body.x,
      body.history,
      body.method,
    );
    void this.anomaly.emitIfAnomaly(body.zone, result);
    return result;
  }
}
