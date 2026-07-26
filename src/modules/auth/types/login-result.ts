import { LoginSucceededResult } from "./authentication-success-result.js";
import { LoginFailedResult } from "./login-failed-result.js";
import { LoginMfaRequiredResult } from "./login-mfa-required-result.js";

export type LoginResult =
  | LoginSucceededResult
  | LoginMfaRequiredResult
  | LoginFailedResult;