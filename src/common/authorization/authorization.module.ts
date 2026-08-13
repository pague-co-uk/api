import { APP_GUARD } from "@nestjs/core";

import { Module } from "@nestjs/common";
import { AuthenticationCookieService } from "../../modules/auth/services/authentication-cookie.service.js";
import { SessionService } from "../../modules/auth/services/session.service.js";
import { SessionRepository } from "../../repositories/sessionRepository.js";
import { UserRepository } from "../../repositories/userRepository.js";
import { ClockService } from "../services/clock.service.js";
import { RandomGenerator } from "../services/random.service.js";
import { SecretHasher } from "../services/secretHasher.service.js";
import { AuthenticationGuard } from "./guards/index.js";
import { PrincipalMapper } from "./mapper/principal.mapper.js";
import { AuthorizationService } from "./services/authorization.service.js";
import { PrincipalService } from "./services/principal.service.js";

@Module({
  providers: [
    PrincipalService,
    AuthorizationService,
    PrincipalMapper,
    UserRepository,
    SessionService,
    ClockService,
    RandomGenerator,
    SecretHasher,
    SessionRepository,
    AuthenticationCookieService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],

  exports: [
    PrincipalService,
    AuthorizationService,
    PrincipalMapper
  ],
})
export class AuthorizationModule { }