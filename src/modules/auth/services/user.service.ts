import { Injectable } from "@nestjs/common";
import { getComponentLogger, getMeter, recordException, withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { User } from "@prisma/client";
import { ClockService } from "src/common/clock.service.js";
import { AppConfigService } from "src/config/config.service.js";
import { EmailAlreadyExistsException } from "src/exceptions/email-already-exists.exception.js";
import { UserNotFoundException } from "src/exceptions/user-not-found.exception.js";
import { UsernameAlreadyExistsException } from "src/exceptions/username-not-available.exception.js";
import { ChangePasswordRequest } from "../dto/change-password-request.js";
import { CreateUserRequest } from "../dto/create-user-request.js";
import { UpdateUserRequest } from "../dto/update-user-request.js";
import { UserRepository } from "../repositories/userRepository.js";
import { PasswordService } from "./password.service.js";

@Injectable()
export class UserService {

  private readonly logger =
    getComponentLogger(
      "UserService",
    );

  private readonly usersCreatedCounter =
    getMeter().createCounter(
      "auth.user.created",
      {
        description:
          "Number of created users.",
      },
    );

  private readonly passwordsChangedCounter =
    getMeter().createCounter(
      "auth.user.password.changed",
      {
        description:
          "Number of password changes.",
      },
    );

  private readonly successfulLoginsCounter =
    getMeter().createCounter(
      "auth.user.login.success",
      {
        description:
          "Number of successful logins.",
      },
    );

  private readonly failedLoginsCounter =
    getMeter().createCounter(
      "auth.user.login.failed",
      {
        description:
          "Number of failed logins.",
      },
    );

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly clock: ClockService,
    private readonly config: AppConfigService
  ) { }

  // Queries

  async findById(
    id: string,
  ): Promise<User> {
    return withSpan(
      "UserService.findById",
      async (span) => {
        this.logger.debug(
          {
            userId: id,
          },
          "Finding user by ID.",
        );

        span.setAttribute(
          "user.id",
          id,
        );

        try {
          const user =
            this.ensureExists(
              await this.users.findById(
                id,
              ),
            );

          this.logger.debug(
            {
              userId: user.id,
            },
            "User found.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: id,
            },
            "Failed to find user.",
          );

          throw error;
        }
      },
    );
  }

  async findByUsername(
    username: string,
  ): Promise<User> {
    return withSpan(
      "UserService.findByUsername",
      async (span) => {
        this.logger.debug(
          {
            username,
          },
          "Finding user by username.",
        );

        span.setAttribute(
          "user.username",
          username,
        );

        try {
          const user =
            this.ensureExists(
              await this.users.findByUsername(
                username,
              ),
            );

          this.logger.debug(
            {
              userId: user.id,
              username:
                user.username,
            },
            "User found.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              username,
            },
            "Failed to find user by username.",
          );

          throw error;
        }
      },
    );
  }

  async findByEmail(
    clientId: string,
    email: string,
  ): Promise<User> {
    return withSpan(
      "UserService.findByEmail",
      async (span) => {
        this.logger.debug(
          {
            clientId,
            email,
          },
          "Finding user by email.",
        );

        span.setAttributes({
          "client.id":
            clientId,
          "user.email":
            email,
        });

        try {
          const user =
            this.ensureExists(
              await this.users.findByEmail(
                clientId,
                email,
              ),
            );

          this.logger.debug(
            {
              userId:
                user.id,
              clientId:
                user.clientId,
              email:
                user.email,
            },
            "User found.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              clientId,
              email,
            },
            "Failed to find user by email.",
          );

          throw error;
        }
      },
    );
  }

  // Passwords

  async verifyPassword(
    user: User,
    password: string,
  ): Promise<void> {
    return withSpan(
      "UserService.verifyPassword",
      async (span) => {
        this.logger.debug(
          {
            userId: user.id,
          },
          "Verifying user password.",
        );

        span.setAttribute(
          "user.id",
          user.id,
        );

        try {
          await this.passwords.verify(
            password,
            user.passwordHash,
          );

          this.logger.debug(
            {
              userId: user.id,
            },
            "Password verified successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.warn(
            {
              error,
              userId: user.id,
            },
            "Password verification failed.",
          );

          throw error;
        }
      },
    );
  }

  async changePassword(
    request: ChangePasswordRequest,
  ): Promise<User> {
    return withSpan(
      "UserService.changePassword",
      async (span) => {
        this.logger.info(
          {
            userId: request.user.id,
          },
          "Changing user password.",
        );

        span.setAttribute(
          "user.id",
          request.user.id,
        );

        try {
          await this.verifyPassword(
            request.user,
            request.currentPassword,
          );

          const passwordHash =
            await this.passwords.hash(
              request.newPassword,
            );

          const updated =
            await this.users.update(
              request.user.id,
              { passwordHash: passwordHash },
            );

          this.passwordsChangedCounter.add(
            1,
          );

          this.logger.info(
            {
              userId: updated.id,
            },
            "Password changed successfully.",
          );

          return updated;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: request.user.id,
            },
            "Failed to change user password.",
          );

          throw error;
        }
      },
    );
  }

  // Lifecycle

  async create(
    request: CreateUserRequest,
  ): Promise<User> {
    return withSpan(
      "UserService.create",
      async (span) => {
        this.logger.info(
          {
            username: request.username,
            tenantId: request.tenantId,
          },
          "Creating user.",
        );

        span.setAttribute(
          "user.username",
          request.username,
        );

        span.setAttribute(
          "tenant.id",
          request.tenantId,
        );

        try {
          await this.ensureUsernameAvailable(
            request.username,
          );

          await this.ensureEmailAvailable(
            request.email,
          );

          const passwordHash =
            await this.passwords.hash(
              request.password,
            );

          const user =
            await this.users.create({
              client: {
                connect: {
                  id: request.clientId
                }
              },
              ...request,
              passwordHash,
            });

          this.usersCreatedCounter.add(1);

          this.logger.info(
            {
              userId: user.id,
            },
            "User created successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              username: request.username,
            },
            "Failed to create user.",
          );

          throw error;
        }
      },
    );
  }

  async update(
    request: UpdateUserRequest,
  ): Promise<User> {
    return withSpan(
      "UserService.update",
      async (span) => {
        this.logger.info(
          {
            userId: request.userId,
          },
          "Updating user.",
        );

        span.setAttribute(
          "user.id",
          request.userId,
        );

        try {
          const existing =
            await this.findById(
              request.userId,
            );

          if (
            existing.email !==
            request.email
          ) {
            await this.ensureEmailAvailable(
              request.email,
            );
          }

          const updated =
            await this.users.update(
              request.userId,
              request,
            );

          this.logger.info(
            {
              userId: updated.id,
            },
            "User updated successfully.",
          );

          return updated;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              userId: request.userId,
            },
            "Failed to update user.",
          );

          throw error;
        }
      },
    );
  }

  // Helpers

  private ensureExists(
    user: User | null,
  ): User {
    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  private async ensureUsernameAvailable(
    username: string,
  ): Promise<void> {
    return withSpan(
      "UserService.ensureUsernameAvailable",
      async (span) => {
        span.setAttribute(
          "user.username",
          username,
        );

        this.logger.debug(
          { username },
          "Checking username availability.",
        );

        try {
          if (
            await this.users.existsByUsername(
              username,
            )
          ) {
            throw new UsernameAlreadyExistsException(
              username,
            );
          }

          this.logger.debug(
            { username },
            "Username is available.",
          );
        } catch (error) {
          recordException(error);

          if (
            error instanceof
            UsernameAlreadyExistsException
          ) {
            this.logger.warn(
              { username },
              "Username already exists.",
            );
          } else {
            this.logger.error(
              {
                error,
                username,
              },
              "Failed to check username availability.",
            );
          }

          throw error;
        }
      },
    );
  }

  private async ensureEmailAvailable(
    email: string,
  ): Promise<void> {
    return withSpan(
      "UserService.ensureEmailAvailable",
      async (span) => {
        span.setAttribute(
          "user.email",
          email,
        );

        this.logger.debug(
          { email },
          "Checking email availability.",
        );

        try {
          if (
            await this.users.existsByEmail(
              email,
            )
          ) {
            throw new EmailAlreadyExistsException(
              email,
            );
          }

          this.logger.debug(
            { email },
            "Email is available.",
          );
        } catch (error) {
          recordException(error);

          if (
            error instanceof
            EmailAlreadyExistsException
          ) {
            this.logger.warn(
              { email },
              "Email already exists.",
            );
          } else {
            this.logger.error(
              {
                error,
                email,
              },
              "Failed to check email availability.",
            );
          }

          throw error;
        }
      },
    );
  }

  private ensureActive() { }
}