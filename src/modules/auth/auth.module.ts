import { Module } from "@nestjs/common";

import { ClockService } from "../..//common/services/clock.service.js";
import { RandomGenerator } from "../../common/services/random.service.js";
import { SecretHasher } from "../../common/services/secretHasher.service.js";
import { RoleMapper } from "../../modules/roles/mapper/role.mapper.js";
import { UserMapper } from "../../modules/users/mapper/user.mapper.js";
import { UserService } from "../users/services/user.service.js";
import { AuthenticationController } from "./controllers/auth.controller.js";
import { AuthenticationMapper } from "./mappers/auth.mapper.js";
import { VerificationProviderRegistry } from "./providers/providers.registry.js";
import { ApiKeyRepository } from "./repositories/ApiKeyRepository.js";
import { AuthenticationEventRepository } from "./repositories/AuthenticationEventRepository.js";
import { RefreshTokenRepository } from "./repositories/refreshTokenRepository.js";
import { SessionRepository } from "./repositories/sessionRepository.js";
import { UserRepository } from "./repositories/userRepository.js";
import { VerificationChallengeRepository } from "./repositories/verificationChallengeRepository.js";
import { ApiKeyService } from "./services/apikey.service.js";
import { AuthenticationEventService } from "./services/authentication-event.service.js";
import { AuthenticationService } from "./services/authentication.service.js";
import { LoginAttemptService } from "./services/login-attempt.service.js";
import { MfaService } from "./services/mfa.service.js";
import { PasswordService } from "./services/password.service.js";
import { RefreshTokenService } from "./services/refresh-token.service.js";
import { SessionService } from "./services/session.service.js";

import { PermissionMapper } from "../roles/mapper/permission.mapper.js";
import {
  EMAIL_VERIFICATION_PROVIDER,
  SMS_VERIFICATION_PROVIDER,
} from "./constants/mfa.constants.js";
import { EmailVerificationProvider } from "./providers/verification/email-verification.provider.js";
import { SmsVerificationProvider } from "./providers/verification/sms-verification.provider.js";

@Module({
  controllers: [AuthenticationController],
  providers: [
    ClockService,
    RandomGenerator,
    SecretHasher,
    RoleMapper,
    UserMapper,
    AuthenticationMapper,
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
    ApiKeyRepository,
    AuthenticationEventRepository,
    VerificationChallengeRepository,
    PasswordService,
    UserService,
    LoginAttemptService,
    SessionService,
    RefreshTokenService,
    AuthenticationEventService,
    ApiKeyService,
    MfaService,
    VerificationProviderRegistry,
    AuthenticationService,
    RoleMapper, PermissionMapper,
    {
      provide: EMAIL_VERIFICATION_PROVIDER,
      useClass: EmailVerificationProvider,
    },
    {
      provide: SMS_VERIFICATION_PROVIDER,
      useClass: SmsVerificationProvider,
    },
  ],
  exports: [
    AuthenticationService,
    EMAIL_VERIFICATION_PROVIDER,
    SMS_VERIFICATION_PROVIDER,
  ],
})
export class AuthenticationModule { }
