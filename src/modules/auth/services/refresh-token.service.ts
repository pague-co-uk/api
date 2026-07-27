import { Injectable } from "@nestjs/common";
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan
} from "@pague-co-uk/sms-gateway-telemetry";

import { ClockService } from "../../../common/clock.service.js";
import { RandomGenerator } from "../../../common/random.service.js";
import { SecretHasher } from "../../../common/secretHasher.service.js";


import { RefreshToken } from "@prisma/client";
import { InvalidRefreshTokenException } from "src/exceptions/invalid-refresh-token.exception.js";
import { IssueRefreshTokenResponse } from "../dto/issue-refresh-token-response.dto.js";
import { IssueRefreshTokenRequest } from "../dto/issue-refresh-token.dto.js";
import { RevokeRefreshTokenRequest } from "../dto/revoke-refresh-token.dto.js";
import { RevokeSessionRefreshTokensRequest } from "../dto/revoke-session-refresh-tokens-request.dto.js";
import { RotateRefreshTokenResponse } from "../dto/rotate-refresh-token-response.dto.js";
import { RotateRefreshTokenRequest } from "../dto/rotate-refresh-token.dto.js";
import { ValidatedRefreshToken } from "../dto/validate-refresh-token-response.dto.js";
import { ValidateRefreshTokenRequest } from "../dto/validate-refresh-token.dto.js";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository.js";
import { AuthenticationEventService } from "./authentication-event.service.js";


@Injectable()
export class RefreshTokenService {
  // =====================================================
  // Logger
  // =====================================================

  private readonly logger =
    getComponentLogger(
      RefreshTokenService.name,
    );

  // =====================================================
  // Metrics
  // =====================================================

  private readonly issuedCounter =
    getMeter().createCounter(
      "auth.refresh.issued",
      {
        description:
          "Number of refresh tokens issued.",
      },
    );

  private readonly validatedCounter =
    getMeter().createCounter(
      "auth.refresh.validated",
      {
        description:
          "Number of refresh tokens validated.",
      },
    );

  private readonly rotatedCounter =
    getMeter().createCounter(
      "auth.refresh.rotated",
      {
        description:
          "Number of refresh tokens rotated.",
      },
    );

  private readonly revokedCounter =
    getMeter().createCounter(
      "auth.refresh.revoked",
      {
        description:
          "Number of refresh tokens revoked.",
      },
    );

  private readonly sessionRevokedCounter =
    getMeter().createCounter(
      "auth.refresh.session.revoked",
      {
        description:
          "Number of session refresh token revocations.",
      },
    );

  private readonly cleanupCounter =
    getMeter().createCounter(
      "auth.refresh.cleanup",
      {
        description:
          "Number of expired refresh token cleanup operations.",
      },
    );

  // =====================================================
  // Constructor
  // =====================================================

  constructor(
    private readonly tokens: RefreshTokenRepository,
    private readonly events: AuthenticationEventService,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
  ) { }

  private generateRefreshToken(): string {
    return this.random
      .bytes(64)
      .toString("base64url");
  }

  private hashRefreshToken(
    token: string,
  ): string {
    return this.hasher.hash(token);
  }

  private toValidatedRefreshToken(
    token: RefreshToken,
  ): ValidatedRefreshToken {
    return {
      id: token.id,
      sessionId: token.sessionId,
      replacedById: token.replacedById,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    };
  }

  private isExpired(
    token: RefreshToken,
  ): boolean {
    return (
      token.expiresAt <=
      this.clock.now()
    );
  }

  private isRevoked(
    token: RefreshToken,
  ): boolean {
    return token.revokedAt !== null;
  }

  private ensureUsable(
    token: RefreshToken | null,
  ): RefreshToken {
    if (!token) {
      throw new InvalidRefreshTokenException(
        "Refresh token not found.",
      );
    }

    if (this.isRevoked(token)) {
      throw new InvalidRefreshTokenException(
        "Refresh token has been revoked.",
      );
    }

    if (this.isExpired(token)) {
      throw new InvalidRefreshTokenException(
        "Refresh token has expired.",
      );
    }

    return token;
  }

  async issue(
    request: IssueRefreshTokenRequest,
  ): Promise<IssueRefreshTokenResponse> {
    return withSpan(
      "RefreshTokenService.issue",
      async (span) => {
        this.logger.debug(
          {
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
          },
          "Issuing refresh token.",
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        span.setAttribute(
          "auth.user.id",
          request.userId,
        );

        span.setAttribute(
          "auth.client.id",
          request.clientId,
        );

        try {
          const refreshToken =
            this.generateRefreshToken();

          const tokenHash =
            await this.hashRefreshToken(
              refreshToken,
            );

          const token =
            await this.tokens.create({
              tokenHash,
              expiresAt: request.expiresAt,
              session: {
                connect: {
                  id: request.sessionId,
                },
              },
            });

          await this.events.recordRefreshTokenIssued({
            refreshTokenId: token.id,
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
            authenticationMethod:
              request.authenticationMethod,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          });

          this.issuedCounter.add(1);

          span.setAttribute(
            "auth.refresh.id",
            token.id,
          );

          span.addEvent(
            "auth.refresh.issued",
            {
              "auth.refresh.id":
                token.id,
            },
          );

          this.logger.info(
            {
              refreshTokenId: token.id,
              sessionId: request.sessionId,
              userId: request.userId,
              clientId: request.clientId,
            },
            "Refresh token issued.",
          );

          return {
            refreshToken,
            refreshTokenId: token.id,
            expiresAt: token.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              sessionId: request.sessionId,
              userId: request.userId,
              clientId: request.clientId,
            },
            "Failed to issue refresh token.",
          );

          throw error;
        }
      },
    );
  }

  async validate(
    request: ValidateRefreshTokenRequest,
  ): Promise<ValidatedRefreshToken> {
    return withSpan(
      "RefreshTokenService.validate",
      async (span) => {
        this.logger.debug(
          "Validating refresh token.",
        );

        try {
          const tokenHash =
            await this.hashRefreshToken(
              request.refreshToken,
            );

          const token =
            await this.tokens.findByHash(
              tokenHash,
            );

          const validated =
            this.ensureUsable(token);

          this.validatedCounter.add(1);

          span.setAttribute(
            "auth.refresh.id",
            validated.id,
          );

          span.setAttribute(
            "auth.session.id",
            validated.sessionId,
          );

          span.addEvent(
            "auth.refresh.validated",
            {
              "auth.refresh.id":
                validated.id,
            },
          );

          this.logger.debug(
            {
              refreshTokenId:
                validated.id,
              sessionId:
                validated.sessionId,
            },
            "Refresh token validated.",
          );

          return this.toValidatedRefreshToken(
            validated,
          );
        } catch (error) {
          recordException(error);

          this.logger.warn(
            {
              error,
            },
            "Refresh token validation failed.",
          );

          throw error;
        }
      },
    );
  }

  async revoke(
    request: RevokeRefreshTokenRequest,
  ): Promise<void> {
    return withSpan(
      "RefreshTokenService.revoke",
      async (span) => {
        this.logger.debug(
          {
            refreshTokenId: request.refreshTokenId,
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
          },
          "Revoking refresh token.",
        );

        span.setAttribute(
          "auth.refresh.id",
          request.refreshTokenId,
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        try {
          const token =
            await this.tokens.findById(
              request.refreshTokenId,
            );

          if (!token || this.isRevoked(token)) {
            this.logger.debug(
              {
                refreshTokenId:
                  request.refreshTokenId,
              },
              "Refresh token already revoked.",
            );

            return;
          }

          await this.tokens.revoke(
            token.id,
            this.clock.now(),
          );

          await this.events
            .recordRefreshTokenRevoked({
              refreshTokenId: token.id,
              sessionId: request.sessionId,
              userId: request.userId,
              clientId: request.clientId,
              authenticationMethod:
                request.authenticationMethod,
              ipAddress: request.ipAddress,
              userAgent: request.userAgent,
            });

          this.revokedCounter.add(1);

          span.addEvent(
            "auth.refresh.revoked",
            {
              "auth.refresh.id":
                token.id,
            },
          );

          this.logger.info(
            {
              refreshTokenId: token.id,
              sessionId: request.sessionId,
            },
            "Refresh token revoked.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              refreshTokenId:
                request.refreshTokenId,
            },
            "Failed to revoke refresh token.",
          );

          throw error;
        }
      },
    );
  }

  async revokeSessionRefreshTokens(
    request: RevokeSessionRefreshTokensRequest,
  ): Promise<void> {
    return withSpan(
      "RefreshTokenService.revokeSession",
      async (span) => {
        this.logger.debug(
          {
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
          },
          "Revoking session refresh tokens.",
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        try {
          await this.tokens.revokeBySession(
            request.sessionId,
            this.clock.now(),
          );

          await this.events.recordSessionRevoked({
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
            authenticationMethod:
              request.authenticationMethod,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          });

          this.sessionRevokedCounter.add(1);

          span.addEvent(
            "auth.session.refresh-tokens.revoked",
            {
              "auth.session.id":
                request.sessionId,
            },
          );

          this.logger.info(
            {
              sessionId: request.sessionId,
              userId: request.userId,
              clientId: request.clientId,
            },
            "Session refresh tokens revoked.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              sessionId: request.sessionId,
            },
            "Failed to revoke session refresh tokens.",
          );

          throw error;
        }
      },
    );
  }

  async rotate(
    request: RotateRefreshTokenRequest,
  ): Promise<RotateRefreshTokenResponse> {
    return withSpan(
      "RefreshTokenService.rotate",
      async (span) => {
        this.logger.debug(
          {
            sessionId: request.sessionId,
            userId: request.userId,
            clientId: request.clientId,
          },
          "Rotating refresh token.",
        );

        span.setAttribute(
          "auth.session.id",
          request.sessionId,
        );

        try {
          const currentTokenHash =
            this.hashRefreshToken(
              request.refreshToken,
            );

          const refreshToken =
            this.generateRefreshToken();

          const newTokenHash =
            this.hashRefreshToken(
              refreshToken,
            );

          const {
            previousToken,
            newToken,
          } = await this.tokens.withTransaction(
            async (tx) => {
              const tokens =
                this.tokens.withDatabase(tx);

              const events =
                this.events.withDatabase(tx);

              const currentToken =
                this.ensureUsable(
                  await tokens.findByHash(
                    currentTokenHash,
                  ),
                );

              const created =
                await tokens.create({
                  session: {
                    connect: {
                      id: currentToken.sessionId,
                    },
                  },
                  tokenHash: newTokenHash,
                  expiresAt:
                    request.expiresAt,
                });

              await tokens.replace(
                currentToken.id,
                created.id,
                this.clock.now(),
              );

              await events.recordRefreshTokenRotated({
                refreshTokenId:
                  created.id,
                previousRefreshTokenId:
                  currentToken.id,
                sessionId:
                  currentToken.sessionId,
                userId:
                  request.userId,
                clientId:
                  request.clientId,
                authenticationMethod:
                  request.authenticationMethod,
                ipAddress:
                  request.ipAddress,
                userAgent:
                  request.userAgent,
              });

              return {
                previousToken:
                  currentToken,
                newToken: created,
              };
            },
          );

          this.rotatedCounter.add(1);

          span.setAttribute(
            "auth.refresh.id",
            newToken.id,
          );

          span.addEvent(
            "auth.refresh.rotated",
            {
              "auth.refresh.id":
                newToken.id,
              "auth.refresh.previous.id":
                previousToken.id,
            },
          );

          this.logger.info(
            {
              previousRefreshTokenId:
                previousToken.id,
              refreshTokenId:
                newToken.id,
              sessionId:
                previousToken.sessionId,
            },
            "Refresh token rotated.",
          );

          return {
            refreshToken,
            refreshTokenId:
              newToken.id,
            expiresAt:
              newToken.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              sessionId:
                request.sessionId,
            },
            "Failed to rotate refresh token.",
          );

          throw error;
        }
      },
    );
  }
}