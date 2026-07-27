import { RevokeRefreshTokenRequest } from "./revoke-refresh-token.dto.js";

export interface LogoutRequest extends RevokeRefreshTokenRequest {
  sessionId: string;
}