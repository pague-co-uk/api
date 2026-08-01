import { Injectable } from "@nestjs/common";

import {
  VerificationMessage,
  VerificationProvider,
} from "../../interfaces/verification-provider.interface.js";

@Injectable()
export class EmailVerificationProvider
  implements VerificationProvider {

  async send(
    message: VerificationMessage,
  ): Promise<void> {

    // TODO:
    // await this.emailService.send({
    //   to: message.recipient,
    //   subject: this.getSubject(message.purpose),
    //   body: this.buildBody(message),
    // });

    throw new Error(
      "Not implemented.",
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
    return `Your verification code is ${message.code}.`;
  }
}