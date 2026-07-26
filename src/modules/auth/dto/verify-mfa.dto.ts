export interface VerifyMfaRequest {
  challengeId: string;

  code: string;

  ipAddress: string;

  userAgent: string;
}