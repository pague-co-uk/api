import { Inject, Injectable } from "@nestjs/common";

import { VerificationChannel } from "@prisma/client";

import {
  EMAIL_VERIFICATION_PROVIDER,
  SMS_VERIFICATION_PROVIDER,
} from "../constants/mfa.constants.js";

import type {
  VerificationProvider,
} from "../interfaces/verification-provider.interface.js";

import { UnsupportedVerificationChannelException } from "../../../exceptions/auth/unsupported-verification-channel.exception.js";

@Injectable()
export class VerificationProviderRegistry {

  private readonly providers: Map<
    VerificationChannel,
    VerificationProvider
  >;

  constructor(
    @Inject(EMAIL_VERIFICATION_PROVIDER)
    private readonly emailProvider: VerificationProvider,

    @Inject(SMS_VERIFICATION_PROVIDER)
    private readonly smsProvider: VerificationProvider,
  ) {
    this.providers = new Map<
      VerificationChannel,
      VerificationProvider
    >([
      [VerificationChannel.EMAIL, this.emailProvider],
      [VerificationChannel.SMS, this.smsProvider],
    ]);
  }

  get(
    channel: VerificationChannel,
  ): VerificationProvider {

    const provider = this.providers.get(
      channel,
    );

    if (!provider) {
      throw new UnsupportedVerificationChannelException(
        channel,
      );
    }

    return provider;
  }

}
