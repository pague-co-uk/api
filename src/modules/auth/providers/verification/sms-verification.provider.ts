import { Injectable } from "@nestjs/common";

import { VerificationPurpose } from "@prisma/client";

import { getComponentLogger } from "@pague-co-uk/sms-gateway-telemetry";

import {
  VerificationMessage,
  VerificationProvider,
} from "../../interfaces/verification-provider.interface.js";

@Injectable()
export class SmsVerificationProvider
  implements VerificationProvider {

  private readonly logger = getComponentLogger(
    "SmsVerificationProvider",
  );

  constructor(
    // TODO:
    // private readonly smsService: SmsService,
  ) { }

  async send(
    message: VerificationMessage,
  ): Promise<void> {

    this.logger.info(
      {
        recipient: message.recipient,
        purpose: message.purpose,
      },
      "Sending SMS verification code.",
    );

    // await this.smsService.send({
    //   to: message.recipient,
    //   message: this.buildMessage(message),
    // });

    this.logger.info(
      {
        recipient: message.recipient,
        purpose: message.purpose,
      },
      "SMS verification code sent.",
    );
  }

  private buildMessage(
    message: VerificationMessage,
  ): string {

    switch (message.purpose) {

      case VerificationPurpose.LOGIN:
        return `Your login verification code is ${message.code}. Token: ${message.verificationToken}`;

      case VerificationPurpose.PASSWORD_RESET:
        return `Your password reset verification code is ${message.code}. Token: ${message.verificationToken}`;

      case VerificationPurpose.PHONE_VERIFICATION:
        return `Your phone verification code is ${message.code}. Token: ${message.verificationToken}`;

      case VerificationPurpose.EMAIL_VERIFICATION:
        return `Your verification code is ${message.code}. Token: ${message.verificationToken}`;

      default:
        return `Your verification code is ${message.code}. Token: ${message.verificationToken}`;
    }
  }
}
