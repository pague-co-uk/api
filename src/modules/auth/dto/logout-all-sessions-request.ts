import { RevokeSessionRefreshTokensRequest } from "./revoke-session-refresh-tokens-request.dto.js";

export interface LogoutAllSessionsRequest extends RevokeSessionRefreshTokensRequest {
  userId: string;

  clientId: string;

  ipAddress: string;

  userAgent: string;
}