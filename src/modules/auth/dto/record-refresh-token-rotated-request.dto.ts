import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordRefreshTokenRotatedRequest
  extends AuthenticationEventRequest {
  readonly sessionId: string;

  readonly previousRefreshTokenId: string;

  readonly refreshTokenId: string;
}