// §35 — Global API infrastructure: guard, validation, consistent responses.
import { Global, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE, APP_GUARD } from "@nestjs/core";
import { ApiGuard } from "./api-guard";

@Global()
@Module({
  providers: [
    ApiGuard,
    {
      provide: APP_GUARD,
      useClass: ApiGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
  exports: [ApiGuard],
})
export class ApiModule {}
