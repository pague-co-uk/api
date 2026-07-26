import { AuthenticationEventRequest } from "./authentication-event-request.dto.js";

export interface RecordMfaChallengeCreatedRequest
  extends AuthenticationEventRequest {
  readonly challengeId: string;

  readonly expiresAt: Date;
}