import { LoginStatus } from "../enums/login-status.js";
import { MfaChallengeResult } from "./mfa-challenge-result.js";
export interface LoginMfaRequiredResult {
  status: LoginStatus.MFA_REQUIRED;

  challenge: MfaChallengeResult;
}