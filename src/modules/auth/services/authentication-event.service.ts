import { Injectable } from "@nestjs/common";
import type { Counter } from "@opentelemetry/api";
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import {
  AuthenticationEventType,
  Prisma,
} from "@prisma/client";

import { RecordLoginFailedRequest } from "../dto/record-login-failed-request.dto.js";
import { RecordLoginSucceededRequest } from "../dto/record-login-succeeded-request.dto.js";
import { RecordLogoutAllRequest } from "../dto/record-logout-all-request.dto.js";
import { RecordLogoutRequest } from "../dto/record-logout-request.dto.js";
import { RecordMfaChallengeCreatedRequest } from "../dto/record-mfa-challenge-created-request.dto.js";
import { RecordMfaVerifiedRequest } from "../dto/record-mfa-verified-request.dto.js";
import { RecordRefreshTokenIssuedRequest } from "../dto/record-refresh-token-issued-request.dto.js";
import { RecordRefreshTokenRevokedRequest } from "../dto/record-refresh-token-revoked-request.dto.js";
import { RecordRefreshTokenRotatedRequest } from "../dto/record-refresh-token-rotated-request.dto.js";
import { RecordSessionRevokedRequest } from "../dto/record-session-revoked-request.dto.js";
import { AuthenticationEventRepository } from "../repositories/AuthenticationEventRepository.js";

@Injectable()
export class AuthenticationEventService {
  // =====================================================
  // Logger
  // =====================================================

  private readonly logger =
    getComponentLogger(
      AuthenticationEventService.name,
    );

  // =====================================================
  // Metrics
  // =====================================================

  private readonly loginSucceededCounter =
    getMeter().createCounter(
      "auth.event.login.succeeded",
      {
        description:
          "Number of successful login audit events.",
      },
    );

  private readonly loginFailedCounter =
    getMeter().createCounter(
      "auth.event.login.failed",
      {
        description:
          "Number of failed login audit events.",
      },
    );

  private readonly mfaChallengeCounter =
    getMeter().createCounter(
      "auth.event.mfa.challenge",
      {
        description:
          "Number of MFA challenge audit events.",
      },
    );

  private readonly mfaVerifiedCounter =
    getMeter().createCounter(
      "auth.event.mfa.verified",
      {
        description:
          "Number of MFA verification audit events.",
      },
    );

  private readonly refreshIssuedCounter =
    getMeter().createCounter(
      "auth.event.refresh.issued",
      {
        description:
          "Number of refresh token issuance events.",
      },
    );

  private readonly refreshRotatedCounter =
    getMeter().createCounter(
      "auth.event.refresh.rotated",
      {
        description:
          "Number of refresh token rotation events.",
      },
    );

  private readonly refreshRevokedCounter =
    getMeter().createCounter(
      "auth.event.refresh.revoked",
      {
        description:
          "Number of refresh token revocation events.",
      },
    );

  private readonly sessionRevokedCounter =
    getMeter().createCounter(
      "auth.event.session.revoked",
      {
        description:
          "Number of session revocation events.",
      },
    );

  private readonly logoutCounter =
    getMeter().createCounter(
      "auth.event.logout",
      {
        description:
          "Number of logout events.",
      },
    );

  private readonly logoutAllCounter =
    getMeter().createCounter(
      "auth.event.logout.all",
      {
        description:
          "Number of logout all events.",
      },
    );

  // =====================================================
  // Constructor
  // =====================================================

  constructor(
    private readonly events: AuthenticationEventRepository,
  ) { }

  // =====================================================
  // Public API
  // =====================================================

  async recordLoginSucceeded(
    request: RecordLoginSucceededRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordLoginSucceeded",
      AuthenticationEventType.LOGIN_SUCCESS,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: {
          connect: {
            id: request.clientId,
          },
        },
        user: {
          connect: {
            id: request.userId,
          },
        },
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.loginSucceededCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  private connectUser(userId: string) {
    return {
      connect: {
        id: userId,
      },
    };
  }

  private connectClient(clientId: string) {
    return {
      connect: {
        id: clientId,
      },
    };
  }

  async recordLoginFailed(
    request: RecordLoginFailedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordLoginFailed",
      AuthenticationEventType.LOGIN_FAILED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        failureReason: request.reason,
      },
      this.loginFailedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordMfaChallengeCreated(
    request: RecordMfaChallengeCreatedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordMfaChallengeCreated",
      AuthenticationEventType.MFA_CHALLENGE_CREATED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.mfaChallengeCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordMfaVerified(
    request: RecordMfaVerifiedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordMfaVerified",
      AuthenticationEventType.MFA_VERIFIED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.mfaVerifiedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordRefreshTokenIssued(
    request: RecordRefreshTokenIssuedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordRefreshTokenIssued",
      AuthenticationEventType.REFRESH_TOKEN_ISSUED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.refreshIssuedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordRefreshTokenRotated(
    request: RecordRefreshTokenRotatedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordRefreshTokenRotated",
      AuthenticationEventType.REFRESH_TOKEN_ROTATED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.refreshRotatedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordRefreshTokenRevoked(
    request: RecordRefreshTokenRevokedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordRefreshTokenRevoked",
      AuthenticationEventType.REFRESH_TOKEN_REVOKED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.refreshRevokedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordSessionRevoked(
    request: RecordSessionRevokedRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordSessionRevoked",
      AuthenticationEventType.SESSION_REVOKED,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.sessionRevokedCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordLogout(
    request: RecordLogoutRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordLogout",
      AuthenticationEventType.LOGOUT,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        sessionId: request.sessionId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.logoutCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
        sessionId: request.sessionId,
      },
    );
  }

  async recordLogoutAll(
    request: RecordLogoutAllRequest,
  ): Promise<void> {
    return this.recordEvent(
      "AuthenticationEventService.recordLogoutAll",
      AuthenticationEventType.LOGOUT_ALL,
      {
        authenticationMethod:
          request.authenticationMethod,
        client: this.connectClient(request.clientId),
        user: this.connectUser(request.userId),
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      },
      this.logoutAllCounter,
      {
        userId: request.userId,
        clientId: request.clientId,
      },
    );
  }

  // =====================================================
  // Private Helpers
  // =====================================================

  private async recordEvent(
    operation: string,
    type: AuthenticationEventType,
    data: Omit<
      Prisma.AuthenticationEventCreateInput,
      "type"
    >,
    counter: Counter,
    context: {
      userId?: string;
      clientId?: string;
      sessionId?: string;
    },
  ): Promise<void> {
    return withSpan(
      operation,
      async (span) => {
        this.logger.debug(
          {
            type,
            ...context,
          },
          "Recording authentication event.",
        );

        span.setAttribute(
          "auth.event.type",
          type,
        );

        if (context.userId) {
          span.setAttribute(
            "auth.user.id",
            context.userId,
          );
        }

        if (context.clientId) {
          span.setAttribute(
            "auth.client.id",
            context.clientId,
          );
        }

        if (context.sessionId) {
          span.setAttribute(
            "auth.session.id",
            context.sessionId,
          );
        }

        try {
          const event =
            await this.events.create({
              ...data,
              type,
            });

          span.setAttribute(
            "auth.event.id",
            event.id,
          );

          span.addEvent(
            "auth.event.recorded",
          );

          counter.add(1, {
            "auth.event.type": type,
          });

          this.logger.info(
            {
              eventId: event.id,
              type,
              ...context,
            },
            "Authentication event recorded.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              type,
              ...context,
            },
            "Failed to record authentication event.",
          );

          throw error;
        }
      },
    );
  }
}