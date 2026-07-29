import { Injectable } from "@nestjs/common";
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";
import type { User } from "@prisma/client";

import { ClockService } from "../../../common/services/clock.service.js";
import { AppConfigService } from "../../../config/config.service.js";
import { UserRepository } from "../repositories/userRepository.js";

export interface LoginAttemptResult {
  accountLocked: boolean;

  failedLoginAttempts: number;

  lockedUntil: Date | null;
}

@Injectable()
export class LoginAttemptService {
  private readonly logger =
    getComponentLogger(LoginAttemptService.name);

  private readonly failedCounter =
    getMeter().createCounter(
      "auth.login_attempt.failed",
      {
        description:
          "Number of failed login attempts.",
      },
    );

  private readonly lockedCounter =
    getMeter().createCounter(
      "auth.login_attempt.locked",
      {
        description:
          "Number of account lockouts.",
      },
    );

  private readonly resetCounter =
    getMeter().createCounter(
      "auth.login_attempt.reset",
      {
        description:
          "Number of login attempt resets.",
      },
    );

  private readonly lockClearedCounter =
    getMeter().createCounter(
      "auth.login_attempt.lock_cleared",
      {
        description:
          "Number of manually cleared account locks.",
      },
    );

  constructor(
    private readonly users: UserRepository,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
  ) { }

  async recordFailure(
    user: User,
  ): Promise<LoginAttemptResult> {
    return withSpan(
      "LoginAttemptService.recordFailure",
      async (span) => {
        this.logger.debug(
          {
            userId: user.id,
          },
          "Recording failed login attempt.",
        );

        try {
          const failedLoginAttempts =
            user.failedLoginAttempts + 1;

          let lockedUntil =
            user.lockedUntil;

          let accountLocked = false;

          if (
            failedLoginAttempts >=
            this.config.auth.maxFailedLoginAttempts
          ) {
            lockedUntil = new Date(
              this.clock.now().getTime() +
              this.config.auth
                .accountLockDurationMinutes *
              60 *
              1000,
            );

            accountLocked = true;
          }

          await this.users.recordFailedLogin(
            user.id,
            failedLoginAttempts,
            lockedUntil,
          );

          span.setAttribute(
            "user.id",
            user.id,
          );

          span.setAttribute(
            "auth.failed_login_attempts",
            failedLoginAttempts,
          );

          this.failedCounter.add(1);

          if (accountLocked) {
            span.addEvent(
              "auth.login_attempt.locked",
            );

            this.lockedCounter.add(1);

            this.logger.info(
              {
                userId: user.id,
                lockedUntil,
              },
              "Account locked due to repeated authentication failures.",
            );
          }

          return {
            accountLocked,
            failedLoginAttempts,
            lockedUntil,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: user.id,
            },
            "Failed to record login failure.",
          );

          throw error;
        }
      },
    );
  }

  async recordSuccess(
    user: User,
  ): Promise<void> {
    return withSpan(
      "LoginAttemptService.recordSuccess",
      async (span) => {
        this.logger.debug(
          {
            userId: user.id,
          },
          "Recording successful login.",
        );

        try {
          const now =
            this.clock.now();

          await this.users.recordSuccessfulLogin(
            user.id,
            now,
          );

          span.setAttribute(
            "user.id",
            user.id,
          );

          span.addEvent(
            "auth.login_attempt.reset",
          );

          this.resetCounter.add(1);

          this.logger.info(
            {
              userId: user.id,
            },
            "Login attempts reset.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: user.id,
            },
            "Failed to record successful login.",
          );

          throw error;
        }
      },
    );
  }

  async clearLock(
    user: User,
  ): Promise<void> {
    return withSpan(
      "LoginAttemptService.clearLock",
      async (span) => {
        this.logger.debug(
          {
            userId: user.id,
          },
          "Clearing account lock.",
        );

        try {
          await this.users.clearLoginLock(
            user.id,
          );

          span.setAttribute(
            "user.id",
            user.id,
          );

          span.addEvent(
            "auth.login_attempt.lock.cleared",
          );

          this.lockClearedCounter.add(1);

          this.logger.info(
            {
              userId: user.id,
            },
            "Account lock cleared.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: user.id,
            },
            "Failed to clear account lock.",
          );

          throw error;
        }
      },
    );
  }
}