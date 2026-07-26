import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordLogoutRequest
  extends AuthenticationEventRequest {
  readonly sessionId: string;
}