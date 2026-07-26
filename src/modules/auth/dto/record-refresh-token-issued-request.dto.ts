import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordRefreshTokenIssuedRequest
  extends AuthenticationEventRequest {
  readonly sessionId: string;

  readonly refreshTokenId: string;
}