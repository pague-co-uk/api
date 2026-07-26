import { LoginStatus } from "../enums/login-status.js";
import { AuthenticationResult } from "./authenticaton-result.js";
export interface LoginSucceededResult {
  status: LoginStatus.SUCCESS;

  authentication: AuthenticationResult;
}