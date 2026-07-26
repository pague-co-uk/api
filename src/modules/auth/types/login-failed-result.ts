import { AuthenticationFailureReason } from "../enums/authentication-failure-reason.js";
import { LoginStatus } from "../enums/login-status.js";

export interface LoginFailedResult {
  status: LoginStatus.FAILED;

  reason: AuthenticationFailureReason;
}