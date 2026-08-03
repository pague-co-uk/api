import { Injectable } from '@nestjs/common';
import {
  getComponentLogger,
  getMeter,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';
import { User } from '@prisma/client';
import { EmailAlreadyExistsException } from '../../../exceptions/auth/email-already-exists.exception.js';
import { UserNotFoundException } from '../../../exceptions/auth/user-not-found.exception.js';
import { UsernameAlreadyExistsException } from '../../../exceptions/auth/username-not-available.exception.js';
import { UserRepository } from '../../auth/repositories/userRepository.js';
import { PasswordService } from '../../auth/services/password.service.js';
import { UserMapper } from '../mapper/user.mapper.js';


@Injectable()
export class UserService {
  private readonly logger = getComponentLogger('UserService');

  private readonly usersCreatedCounter = getMeter().createCounter(
    'auth.user.created',
    {
      description: 'Number of created users.',
    },
  );

  private readonly passwordsChangedCounter = getMeter().createCounter(
    'auth.user.password.changed',
    {
      description: 'Number of password changes.',
    },
  );

  private readonly successfulLoginsCounter = getMeter().createCounter(
    'auth.user.login.success',
    {
      description: 'Number of successful logins.',
    },
  );

  private readonly failedLoginsCounter = getMeter().createCounter(
    'auth.user.login.failed',
    {
      description: 'Number of failed logins.',
    },
  );

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly userMapper: UserMapper
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

  mapper(): UserMapper {
    return this.userMapper;
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

  // Lifecycle

  async create(
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    password: string,
    clientId: string,
    phone?: string | null,
  ): Promise<User> {
    return withSpan('UserService.create', async (span) => {
      this.logger.info(
        {
          username,
          clientId,
        },
        'Creating user.',
      );

      span.setAttribute('client.id', clientId);

      try {
        await this.ensureUsernameAvailable(username);

        await this.ensureEmailAvailable(email);

        const passwordHash = await this.passwords.hash(password);

        const user = await this.users.create({
          client: {
            connect: {
              id: clientId,
            },
          },
          firstName,
          lastName,
          username,
          email,
          phone,
          passwordHash,
        });

        this.usersCreatedCounter.add(1);

        this.logger.info(
          {
            userId: user.id,
          },
          'User created successfully.',
        );

        return user;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            username,
          },
          'Failed to create user.',
        );

        throw error;
      }
    });
  }

  async update(
    userId: string,
    email?: string,
    username?: string,
  ): Promise<User> {
    return withSpan('UserService.update', async (span) => {
      this.logger.info(
        {
          userId,
        },
        'Updating user.',
      );

      span.setAttribute('user.id', userId);

      try {
        const existing = await this.findById(userId);

        if (email && existing.email !== email) {
          await this.ensureEmailAvailable(email);
        }

        if (username && existing.username !== username) {
          await this.ensureUsernameAvailable(username);
        }

        const updated = await this.users.update(userId, {
          ...(email === undefined ? {} : { email }),
          ...(username === undefined ? {} : { username }),
        });

        this.logger.info(
          {
            userId: updated.id,
          },
          'User updated successfully.',
        );

        return updated;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            error,
            userId,
          },
          'Failed to update user.',
        );

        throw error;
      }
    });
  }

  // Helpers

  private ensureExists(user: User | null): User {
    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
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

  private async ensureEmailAvailable(email: string): Promise<void> {
    return withSpan('UserService.ensureEmailAvailable', async (span) => {
      this.logger.debug({ email }, 'Checking email availability.');

      try {
        if (await this.users.existsByEmail(email)) {
          throw new EmailAlreadyExistsException(email);
        }

        this.logger.debug({ email }, 'Email is available.');
      } catch (error) {
        recordException(error);

        if (error instanceof EmailAlreadyExistsException) {
          this.logger.warn({ email }, 'Email already exists.');
        } else {
          this.logger.error(
            {
              error,
              email,
            },
            'Failed to check email availability.',
          );
        }

        throw error;
      }
    });
  }
}
