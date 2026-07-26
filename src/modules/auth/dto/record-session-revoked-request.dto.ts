import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordSessionRevokedRequest
  extends AuthenticationEventRequest {
  readonly sessionId: string;
}