import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordLogoutAllRequest
  extends AuthenticationEventRequest {
  readonly revokedSessions: number;
}