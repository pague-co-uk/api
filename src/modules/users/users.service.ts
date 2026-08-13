import { Injectable } from "@nestjs/common";

import { createCounterMetric, getComponentLogger, recordException, withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { AuditService } from "../../audit/services/audit.service.js";
import type { Page } from "../../common/query/page.interface.js";

import { Prisma, UserStatus } from "@prisma/client";
import { EmailAlreadyExistsException } from "../../exceptions/auth/email-already-exists.exception.js";
import { UserNotFoundException } from "../../exceptions/auth/user-not-found.exception.js";
import { UsernameAlreadyExistsException } from "../../exceptions/auth/username-not-available.exception.js";
import { RolesNotFoundException } from "../../exceptions/entity/roles.exception.js";
import type { UserQueryOptions } from "../../repositories/options/user.options.js";
import { RoleRepository } from "../../repositories/RoleRepository.js";
import { UserRepository } from "../../repositories/userRepository.js";
import { UserRoleRepository } from "../../repositories/UserRoleRepository.js";
import { PasswordService } from "../auth/services/password.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UserWithRolesEntity } from "./user.mapper.js";

@Injectable()
export class UsersService {
  private readonly logger =
    getComponentLogger("UsersService");

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly userRoles: UserRoleRepository,
    private readonly roles: RoleRepository
  ) { }

  private readonly usersCreatedCounter =
    createCounterMetric({
      name: "users.created",
      description: "Number of users created.",
    });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.findById",
      async (span) => {
        this.logger.debug(
          { userId: id },
          "Retrieving user.",
        );

        span.setAttribute("user.id", id);

        try {
          const user =
            await this.findEntityOrThrow(id);

          this.logger.debug(
            { userId: user.id },
            "User retrieved successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
            },
            "Failed to retrieve user.",
          );

          throw error;
        }
      },
    );
  }

  async findMany(
    query: UserQueryOptions,
  ): Promise<Page<UserWithRolesEntity>> {
    return withSpan(
      "UsersService.findMany",
      async (span) => {
        this.logger.debug(
          { query },
          "Retrieving users.",
        );

        try {
          const page = await this.users.findMany(query);

          span.setAttribute(
            "users.count",
            page.items.length,
          );

          this.logger.debug(
            {
              count: page.items.length,
            },
            "Users retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              query,
            },
            "Failed to retrieve users.",
          );

          throw error;
        }
      },
    );
  }

  async count(
    query: Pick<UserQueryOptions, "search" | "filters"> = {},
  ): Promise<number> {
    return withSpan(
      "UsersService.count",
      async () => {
        return this.users.count(query);
      },
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async create(
    dto: CreateUserDto,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.create",
      async (span) => {
        this.logger.info(
          {
            username: dto.username,
            clientId: dto.clientId,
          },
          "Creating user.",
        );

        span.setAttribute(
          "client.id",
          dto.clientId,
        );

        try {
          await this.ensureUsernameAvailable(
            dto.username,
          );

          await this.ensureEmailAvailable(
            dto.clientId,
            dto.email,
          );

          const passwordHash =
            await this.passwords.hash(
              dto.password,
            );

          const user =
            await this.users.create({
              client: {
                connect: {
                  id: dto.clientId,
                },
              },
              firstName: dto.firstName,
              lastName: dto.lastName,
              username: dto.username,
              email: dto.email,
              phone: dto.phone,
              passwordHash,
            });
          this.usersCreatedCounter.increment();
          await this.audit.record({
            action: "user.created",
            clientId: user.clientId,
            resourceType: "User",
            resourceId: user.id,
            metadata: {
              username: user.username,
              email: user.email,
            },
          });

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
              err: error,
              username: dto.username,
              clientId: dto.clientId,
            },
            "Failed to create user.",
          );

          throw error;
        }
      },
    );
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.update",
      async (span) => {
        this.logger.info(
          {
            userId: id,
          },
          "Updating user.",
        );

        span.setAttribute("user.id", id);

        try {
          const existing =
            await this.findEntityOrThrow(id);

          if (
            dto.username &&
            dto.username !== existing.username
          ) {
            await this.ensureUsernameAvailable(
              dto.username,
            );
          }

          if (
            dto.email &&
            dto.email !== existing.email
          ) {
            await this.ensureEmailAvailable(
              existing.clientId,
              dto.email,
            );
          }

          const update: Prisma.UserUpdateInput = {};

          if (dto.firstName !== undefined) {
            update.firstName = dto.firstName;
          }

          if (dto.lastName !== undefined) {
            update.lastName = dto.lastName;
          }

          if (dto.username !== undefined) {
            update.username = dto.username;
          }

          if (dto.email !== undefined) {
            update.email = dto.email;
          }

          if (dto.phone !== undefined) {
            update.phone = dto.phone;
          }

          const user =
            await this.users.update(id, update);

          await this.audit.record({
            action: "user.updated",
            clientId: user.clientId,
            resourceType: "User",
            resourceId: user.id,
            metadata: {
              username: user.username,
              email: user.email,
            },
          });

          this.logger.info(
            {
              userId: user.id,
            },
            "User updated successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
            },
            "Failed to update user.",
          );

          throw error;
        }
      },
    );
  }

  async delete(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.delete",
      async (span) => {
        this.logger.info(
          {
            userId: id,
          },
          "Deleting user.",
        );

        span.setAttribute("user.id", id);

        try {
          const user =
            await this.findEntityOrThrow(id);

          await this.users.delete(id);

          await this.audit.record({
            action: "user.deleted",
            clientId: user.clientId,
            resourceType: "User",
            resourceId: user.id,
            metadata: {
              username: user.username,
              email: user.email,
            },
          });

          this.logger.info(
            {
              userId: id,
            },
            "User deleted successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
            },
            "Failed to delete user.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async activate(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return this.updateStatus(
      id,
      UserStatus.ACTIVE,
    );
  }

  async deactivate(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return this.updateStatus(
      id,
      UserStatus.DISABLED,
    );
  }

  async unlock(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.unlock",
      async (span) => {
        this.logger.info(
          { userId: id },
          "Unlocking user.",
        );

        span.setAttribute("user.id", id);

        try {
          await this.findEntityOrThrow(id);

          const user =
            await this.users.update(id, {
              status: UserStatus.ACTIVE,
              failedLoginAttempts: 0,
              lockedUntil: null,
            });

          this.logger.info(
            {
              userId: user.id,
            },
            "User unlocked successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
            },
            "Failed to unlock user.",
          );

          throw error;
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------
  async updateRoles(
    userId: string,
    roleIds: readonly string[],
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.updateRoles",
      async (span) => {
        this.logger.info(
          {
            userId,
            roleCount: roleIds.length,
          },
          "Updating user roles.",
        );

        span.setAttribute("user.id", userId);

        try {
          await this.findEntityOrThrow(userId);

          const uniqueRoleIds = [...new Set(roleIds)];

          const roles = await this.roles.findByIds(
            uniqueRoleIds,
          );

          if (roles.length !== uniqueRoleIds.length) {
            const foundRoleIds = new Set(
              roles.map((role) => role.id),
            );

            const missingRoleIds = uniqueRoleIds.filter(
              (roleId) => !foundRoleIds.has(roleId),
            );

            throw new RolesNotFoundException(
              missingRoleIds,
            );
          }

          await this.users.withTransaction(
            async (tx) => {
              const userRoles =
                this.userRoles.withDatabase(tx);

              await userRoles.deleteByUserId(
                userId,
              );

              await userRoles.createMany(
                userId,
                uniqueRoleIds,
              );
            },
          );

          const updatedUser =
            await this.findEntityOrThrow(userId);

          this.logger.info(
            {
              userId,
              roleCount: uniqueRoleIds.length,
            },
            "User roles updated successfully.",
          );

          return updatedUser;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId,
            },
            "Failed to update user roles.",
          );

          throw error;
        }
      },
    );
  }
  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async updateStatus(
    id: string,
    status: UserStatus,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.updateStatus",
      async (span) => {
        this.logger.info(
          {
            userId: id,
            status,
          },
          "Updating user status.",
        );

        span.setAttribute("user.id", id);
        span.setAttribute("user.status", status);

        try {
          await this.findEntityOrThrow(id);

          const user = await this.users.update(id, {
            status,
          });

          await this.audit.record({
            action:
              status === UserStatus.ACTIVE
                ? "user.activated"
                : "user.deactivated",
            clientId: user.clientId,
            resourceType: "User",
            resourceId: user.id,
            metadata: {
              status: user.status,
            },
          });

          this.logger.info(
            {
              userId: user.id,
              status,
            },
            "User status updated successfully.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
              status,
            },
            "Failed to update user status.",
          );

          throw error;
        }
      },
    );
  }

  private async findEntityOrThrow(
    id: string,
  ): Promise<UserWithRolesEntity> {
    return withSpan(
      "UsersService.findEntityOrThrow",
      async (span) => {
        this.logger.debug(
          { userId: id },
          "Finding user entity.",
        );

        span.setAttribute("user.id", id);

        try {
          const user =
            await this.users.findByIdWithRoles(id);

          if (!user) {
            throw new UserNotFoundException();
          }

          this.logger.debug(
            { userId: user.id },
            "User entity found.",
          );

          return user;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              userId: id,
            },
            "Failed to find user entity.",
          );

          throw error;
        }
      },
    );
  }

  private async ensureUsernameAvailable(username: string): Promise<void> {
    return withSpan('UserService.ensureUsernameAvailable', async (span) => {
      this.logger.debug({ username }, 'Checking username availability.');

      try {
        if (await this.users.existsByUsername(username)) {
          throw new UsernameAlreadyExistsException(username);
        }

        this.logger.debug({ username }, 'Username is available.');
      } catch (error) {
        recordException(error);

        if (error instanceof UsernameAlreadyExistsException) {
          this.logger.warn({ username }, 'Username already exists.');
        } else {
          this.logger.error(
            {
              error,
              username,
            },
            'Failed to check username availability.',
          );
        }

        throw error;
      }
    });
  }

  private async ensureEmailAvailable(
    clientId: string,
    email: string,
  ): Promise<void> {
    return withSpan(
      "UsersService.ensureEmailAvailable",
      async (span) => {
        this.logger.debug(
          {
            clientId,
            email,
          },
          "Checking email availability.",
        );

        span.setAttribute("client.id", clientId);

        try {
          const exists = await this.users.existsByEmail(
            clientId,
            email,
          );

          if (exists) {
            throw new EmailAlreadyExistsException(email);
          }

          this.logger.debug(
            {
              clientId,
              email,
            },
            "Email is available.",
          );
        } catch (error) {
          recordException(error);

          if (
            error instanceof EmailAlreadyExistsException
          ) {
            this.logger.warn(
              {
                clientId,
                email,
              },
              "Email already exists.",
            );
          } else {
            this.logger.error(
              {
                err: error,
                clientId,
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
}
