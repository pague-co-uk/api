import { VerificationPurpose } from "@prisma/client";

export interface VerificationMessage {
  recipient: string;
  code: string;
  purpose: VerificationPurpose;
}

export interface VerificationProvider {
  send(
    message: VerificationMessage,
  ): Promise<void>;
}