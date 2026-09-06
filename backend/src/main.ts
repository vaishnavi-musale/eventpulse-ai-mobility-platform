// §35 — Application bootstrap
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { APP_CONFIG } from "./config/config.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(APP_CONFIG);
  // Dev/demo integration: the Vite frontend calls the API from another origin.
  app.enableCors({ origin: true });
  app.enableShutdownHooks();
  await app.listen(config.port);
  const logger = new Logger("Bootstrap");
  logger.log(`EventPulse V2.1 backend listening on :${config.port}`);
}

void bootstrap();
