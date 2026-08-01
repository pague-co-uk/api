import { Module } from "@nestjs/common";

import {
  EMAIL_VERIFICATION_PROVIDER,
  SMS_VERIFICATION_PROVIDER,
} from "./constants/mfa.constants.js";
import { EmailVerificationProvider } from "./providers/verification/email-verification.provider.js";
import { SmsVerificationProvider } from "./providers/verification/sms-verification.provider.js";

@Module({
  providers: [
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
    EMAIL_VERIFICATION_PROVIDER,
    SMS_VERIFICATION_PROVIDER,
  ],
})
export class AuthenticationModule { }