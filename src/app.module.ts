import { Module } from "@nestjs/common";

import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TelemetryInterceptor } from "@pague-co-uk/sms-gateway-telemetry";
import { AuditModule } from "./audit/audit.module.js";
import { AuthorizationModule } from "./common/authorization/authorization.module.js";
import { AuthenticationGuard } from "./common/authorization/guards/authentication.guard.js";
import { AuthorizationGuard } from "./common/authorization/guards/authorization.guard.js";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor.js";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/index.js";
import { GlobalExceptionFilter } from "./filters/global-exception.filter.js";
import { AuditLogModule } from "./modules/audit/audit-log.module.js";
import { AuthenticationModule } from "./modules/auth/auth.module.js";
import { ClientsModule } from "./modules/clients/clients.module.js";
import { FloatLedgerModule } from "./modules/float-ledger/float-ledger.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { MessagesModule } from "./modules/messages/messages.module.js";
import { RolesModule } from "./modules/roles/roles.module.js";
import { SenderIdsModule } from "./modules/sender-ids/sender-ids.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    AuditModule,
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthenticationModule,
    UsersModule,
    RolesModule,
    AuthorizationModule,
    RolesModule,
    ClientsModule,
    SenderIdsModule,
    FloatLedgerModule,
    AuditLogModule,
    MessagesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetryInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ]
})
export class AppModule { }
