import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordMfaVerifiedRequest
  extends AuthenticationEventRequest {
  readonly challengeId: string;

  readonly sessionId: string;
}