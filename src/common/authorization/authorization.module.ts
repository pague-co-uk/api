import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthenticationModule } from "../../modules/auth/auth.module.js";

import { ApiKeyService } from "../../modules/auth/services/apikey.service.js";
import { AuthenticationCookieService } from "../../modules/auth/services/authentication-cookie.service.js";
import { AuthenticationEventService } from "../../modules/auth/services/authentication-event.service.js";
import { AuthenticationService } from "../../modules/auth/services/authentication.service.js";
import { IdentityService } from "../../modules/auth/services/identity.service.js";
import { LoginAttemptService } from "../../modules/auth/services/login-attempt.service.js";
import { PasswordService } from "../../modules/auth/services/password.service.js";
import { SessionService } from "../../modules/auth/services/session.service.js";

import { ApiKeyCapabilityRepository } from "../../repositories/ApiKeyCapabilityRepository.js";
import { ApiKeyRepository } from "../../repositories/ApiKeyRepository.js";
import { SessionRepository } from "../../repositories/sessionRepository.js";
import { UserRepository } from "../../repositories/userRepository.js";

import { ClockService } from "../services/clock.service.js";
import { RandomGenerator } from "../services/random.service.js";
import { SecretHasher } from "../services/secretHasher.service.js";

import { AuthenticationGuard } from "./guards/authentication.guard.js";
import { AuthorizationGuard } from "./guards/authorization.guard.js";
import { PrincipalMapper } from "./mapper/principal.mapper.js";
import { AuthorizationService } from "./services/authorization.service.js";
import { PrincipalService } from "./services/principal.service.js";

@Module({
  imports: [
    AuthenticationModule,
  ],

  providers: [
    PrincipalService,

    AuthorizationService,

    PrincipalMapper,

    UserRepository,

    SessionService,

    PasswordService,

    ClockService,

    RandomGenerator,

    IdentityService,

    SecretHasher,

    SessionRepository,

    ApiKeyService,

    AuthenticationService,

    AuthenticationEventService,

    LoginAttemptService,

    ApiKeyCapabilityRepository,

    ApiKeyRepository,

    AuthenticationCookieService,

    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },

    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],

  exports: [
    PrincipalService,

    AuthorizationService,

    PrincipalMapper,
  ],
})
export class AuthorizationModule { }