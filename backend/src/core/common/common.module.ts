// §27.2 — Common module: health checks, error filters
import { Module, Global } from "@nestjs/common";
import { HealthModule } from "./health/health.module";

@Global()
@Module({
  imports: [HealthModule],
  exports: [HealthModule],
})
export class CommonModule {}
