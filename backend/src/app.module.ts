// §35 — Root AppModule: modular monolith assembly.
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { AppConfigModule } from "./config/config.module";
import { ApiModule } from "./core/api/api.module";
import { CommonModule } from "./core/common/common.module";
import { MessagingModule } from "./core/messaging/messaging.module";
import { SagaModule } from "./core/saga/saga.module";
import { EventSourcingModule } from "./core/event-sourcing/event-sourcing.module";
import { ResilienceModule } from "./core/resilience/resilience.module";
import { ProjectionsModule } from "./core/projections/projections.module";
import { SchedulingModule } from "./core/jobs/scheduling.module";
import { APP_CONFIG } from "./config/config.module";
import { AppConfig } from "./config/app-config.type";
import { GlobalErrorFilter } from "./core/common/filters/global-error.filter";

import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { StateEstimationModule } from "./modules/state-estimation/state-estimation.module";
import { DigitalTwinModule } from "./modules/digital-twin/digital-twin.module";
import { PredictionModule } from "./modules/prediction/prediction.module";
import { SimulationModule } from "./modules/simulation/simulation.module";
import { OptimizationModule } from "./modules/optimization/optimization.module";
import { OrchestrationModule } from "./modules/orchestration/orchestration.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { CommitmentDeliveryModule } from "./modules/commitment-delivery/commitment-delivery.module";
import { GuaranteeLadderModule } from "./modules/guarantee-ladder/guarantee-ladder.module";
import { RecoveryModule } from "./modules/recovery/recovery.module";
import { StrategyControlModule } from "./modules/strategy-control/strategy-control.module";
import { CalibrationModule } from "./modules/calibration/calibration.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import { ExternalIntegrationsModule } from "./modules/external-integrations/external-integrations.module";
import { AiModule } from "./modules/ai/ai.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: "postgres" as const,
        host: config.postgres.host,
        port: config.postgres.port,
        username: config.postgres.user,
        password: config.postgres.password,
        database: config.postgres.database,
        autoLoadEntities: true,
        synchronize: config.nodeEnv !== "production",
      }),
    }),
    CommonModule,
    ApiModule,
    MessagingModule,
    SagaModule,
    EventSourcingModule,
    ResilienceModule,
    ProjectionsModule,
    SchedulingModule,

    // 12 runtime modules (placeholders) — modular monolith, single process.
    IngestionModule,
    StateEstimationModule,
    DigitalTwinModule,
    PredictionModule,
    SimulationModule,
    OptimizationModule,
    OrchestrationModule,
    FeedbackModule,
    CommitmentDeliveryModule,
    GuaranteeLadderModule,
    RecoveryModule,
    StrategyControlModule,
    CalibrationModule,
    PrivacyModule,
    ExternalIntegrationsModule,
    AiModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class AppModule {}
