import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordRefreshTokenRevokedRequest
  extends AuthenticationEventRequest {
  readonly sessionId: string;

  readonly refreshTokenId: string;
}