import { Injectable } from "@nestjs/common";
import { getComponentLogger } from "@pague-co-uk/sms-gateway-telemetry";

import {
  VerificationMessage,
  VerificationProvider,
} from "../../interfaces/verification-provider.interface.js";

@Injectable()
export class EmailVerificationProvider
  implements VerificationProvider {

  private readonly logger = getComponentLogger(
    "EmailVerificationProvider",
  );

  async send(
    message: VerificationMessage,
  ): Promise<void> {

    // This adapter deliberately has no external vendor dependency yet. It is
    // operational for local/development flows and can be replaced behind the
    // same interface when an email client is introduced.
    this.logger.info(
      {
        recipient: message.recipient,
        purpose: message.purpose,
        subject: this.getSubject(message.purpose),
      },
      "Email verification message accepted for delivery.",
    );
  }

  private getSubject(
    purpose: VerificationMessage["purpose"],
  ): string {

    switch (purpose) {

      case "LOGIN":
        return "Login Verification Code";

      case "PASSWORD_RESET":
        return "Password Reset Verification Code";

      case "EMAIL_VERIFICATION":
        return "Verify Your Email Address";

      case "PHONE_VERIFICATION":
        return "Phone Verification Code";

      default:
        return "Verification Code";
    }
  }

  private buildBody(
    message: VerificationMessage,
  ): string {
    return [
      `Your verification code is ${message.code}.`,
      `Verification token: ${message.verificationToken}`,
    ].join("\n");
  }
}
