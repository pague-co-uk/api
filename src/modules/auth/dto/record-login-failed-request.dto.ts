import { AuthenticationFailureReason } from "../enums/authentication-failure-reason.js";
import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordLoginFailedRequest
  extends AuthenticationEventRequest {
  readonly reason: AuthenticationFailureReason;
}