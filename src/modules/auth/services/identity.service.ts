import { Injectable } from '@nestjs/common';
import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import { User } from '@prisma/client';
import { UserNotFoundException } from '../../../exceptions/auth/user-not-found.exception.js';
import { UserRepository } from '../../../repositories/userRepository.js';
import { PasswordService } from './password.service.js';


@Injectable()
export class IdentityService {
  private readonly logger = getComponentLogger('IdentityService');

  private readonly passwordsChangedCounter = createCounterMetric({
    name: 'auth.user.password.changed',
    description: 'Number of password changes.',
  });
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) { }

  // Queries

  async findById(id: string): Promise<User> {
    return withSpan('UserService.findById', async (span) => {
      this.logger.debug(
        {
          userId: id,
        },
        'Finding user by ID.',
      );

      span.setAttribute('user.id', id);

      try {
        const user = this.ensureExists(await this.users.findById(id));

        this.logger.debug(
          {
            userId: user.id,
          },
          'User found.',
        );

        return user;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            userId: id,
          },
          'Failed to find user.',
        );

        throw error;
      }
    });
  }

  async findWithRoles(id: string) {
    return withSpan('UserService.findWithRoles', async (span) => {
      this.logger.debug({ userId: id }, 'Finding user by ID with roles.');

      span.setAttribute('user.id', id);

      try {
        const user = this.ensureExists(
          await this.users.findByIdWithRoles(id),
        );

        this.logger.debug({ userId: user.id }, 'User with roles found.');

        return user as any;
      } catch (error) {
        recordException(error);

        this.logger.error({ error, userId: id }, 'Failed to find user with roles.');

        throw error;
      }
    });
  }

  async findByUsername(username: string): Promise<User> {
    return withSpan('UserService.findByUsername', async (span) => {
      this.logger.debug(
        {
          username,
        },
        'Finding user by username.',
      );

      try {
        const user = this.ensureExists(
          await this.users.findByUsername(username),
        );

        this.logger.debug(
          {
            userId: user.id,
            username: user.username,
          },
          'User found.',
        );

        return user;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            username,
          },
          'Failed to find user by username.',
        );

        throw error;
      }
    });
  }

  async findByEmail(clientId: string, email: string): Promise<User> {
    return withSpan('UserService.findByEmail', async (span) => {
      this.logger.debug(
        {
          clientId,
          email,
        },
        'Finding user by email.',
      );

      span.setAttribute('client.id', clientId);

      try {
        const user = this.ensureExists(
          await this.users.findByEmail(clientId, email),
        );

        this.logger.debug(
          {
            userId: user.id,
            clientId: user.clientId,
            email: user.email,
          },
          'User found.',
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
          'Failed to find user by email.',
        );

        throw error;
      }
    });
  }

  // Passwords

  async verifyPassword(user: User, password: string): Promise<void> {
    return withSpan('UserService.verifyPassword', async (span) => {
      this.logger.debug(
        {
          userId: user.id,
        },
        'Verifying user password.',
      );

      span.setAttribute('user.id', user.id);

      try {
        await this.passwords.verify(password, user.passwordHash);

        this.logger.debug(
          {
            userId: user.id,
          },
          'Password verified successfully.',
        );
      } catch (error) {
        recordException(error);

        this.logger.warn(
          {
            error,
            userId: user.id,
          },
          'Password verification failed.',
        );

        throw error;
      }
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    return withSpan('UserService.changePassword', async (span) => {
      this.logger.info(
        {
          userId,
        },
        'Changing user password.',
      );

      span.setAttribute('user.id', userId);

      try {
        const user = await this.findById(userId);

        await this.verifyPassword(user, currentPassword);

        const passwordHash = await this.passwords.hash(newPassword);

        const updated = await this.users.update(user.id, {
          passwordHash: passwordHash,
        });

        this.passwordsChangedCounter.add(1);

        this.logger.info(
          {
            userId: updated.id,
          },
          'Password changed successfully.',
        );

        return updated;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            userId,
          },
          'Failed to change user password.',
        );

        throw error;
      }
    });
  }

  async resetPassword(
    userId: string,
    newPassword: string,
  ): Promise<User> {
    return withSpan('UserService.resetPassword', async (span) => {
      span.setAttribute('user.id', userId);

      const passwordHash = await this.passwords.hash(newPassword);

      return this.users.update(userId, { passwordHash });
    });
  }

  // Helpers

  private ensureExists(user: User | null): User {
    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }
}
