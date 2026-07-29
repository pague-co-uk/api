import { Module } from "@nestjs/common";

import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/index.js";
import { GlobalExceptionFilter } from "./filters/global-exception.filter.js";
import { HealthModule } from "./modules/health/health.module.js";
import { QueueModule } from "./queue/index.js";

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, HealthModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ]
})
export class AppModule { }