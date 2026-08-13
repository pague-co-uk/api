import { Injectable } from '@nestjs/common';

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from '@pague-co-uk/sms-gateway-telemetry';

import type { Page } from '../../../common/query/page.interface.js';
import { PermissionNotFoundException } from '../../../exceptions/entity/permissions.exceptions.js';

import type { Permission } from '@prisma/client';

import type { PermissionDefinition } from '../../../common/authorization/permissions/permission-definition.js';
import { PermissionDefinitions } from '../../../common/authorization/permissions/permission.definitions.js';
import type { PermissionQueryOptions } from '../../../repositories/options/permission.options.js';
import { PermissionRepository } from '../../../repositories/PermissionRepository.js';

@Injectable()
export class PermissionService {
  private readonly logger = getComponentLogger('PermissionService');

  constructor(private readonly permissions: PermissionRepository) { }

  private readonly permissionsSynchronizedCounter = createCounterMetric({
    name: 'permissions.registry.synchronized',
    description: 'Number of permission registry synchronization operations.',
  });

  private readonly permissionsValidatedCounter = createCounterMetric({
    name: 'permissions.validated',
    description: 'Number of permission validation operations.',
  });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Permission> {
    return withSpan('PermissionService.findById', async (span) => {
      this.logger.debug(
        {
          permissionId: id,
        },
        'Retrieving permission.',
      );

      span.setAttribute('permission.id', id);

      try {
        const permission = await this.permissions.findById(id);

        if (!permission) {
          throw new PermissionNotFoundException(id);
        }

        this.logger.debug(
          {
            permissionId: permission.id,
            permissionName: permission.name,
          },
          'Permission retrieved successfully.',
        );

        return permission;
      } catch (error) {
        recordException(error);

        if (error instanceof PermissionNotFoundException) {
          this.logger.warn(
            {
              permissionId: id,
            },
            'Permission not found.',
          );
        } else {
          this.logger.error(
            {
              err: error,
              permissionId: id,
            },
            'Failed to retrieve permission.',
          );
        }

        throw error;
      }
    });
  }

  async findByName(name: string): Promise<Permission> {
    return withSpan('PermissionService.findByName', async (span) => {
      this.logger.debug(
        {
          permissionName: name,
        },
        'Retrieving permission by name.',
      );

      span.setAttribute('permission.name', name);

      try {
        const permission = await this.permissions.findByName(name);

        if (!permission) {
          throw new PermissionNotFoundException(name);
        }

        this.logger.debug(
          {
            permissionId: permission.id,
            permissionName: permission.name,
          },
          'Permission retrieved successfully.',
        );

        return permission;
      } catch (error) {
        recordException(error);

        if (error instanceof PermissionNotFoundException) {
          this.logger.warn(
            {
              permissionName: name,
            },
            'Permission not found.',
          );
        } else {
          this.logger.error(
            {
              err: error,
              permissionName: name,
            },
            'Failed to retrieve permission.',
          );
        }

        throw error;
      }
    });
  }

  async findMany(
    query: PermissionQueryOptions = { page: 1, pageSize: 20 },
  ): Promise<Page<Permission>> {
    return withSpan('PermissionService.findMany', async (span) => {
      this.logger.debug(
        {
          query,
        },
        'Retrieving permissions.',
      );

      try {
        const page = await this.permissions.findMany(query);

        span.setAttribute('permissions.count', page.items.length);

        this.logger.debug(
          {
            count: page.items.length,
          },
          'Permissions retrieved successfully.',
        );

        return page;
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            err: error,
            query,
          },
          'Failed to retrieve permissions.',
        );

        throw error;
      }
    });
  }

  async count(
    query: Pick<PermissionQueryOptions, 'search' | 'module'> = {},
  ): Promise<number> {
    return withSpan('PermissionService.count', async () => {
      try {
        return await this.permissions.count(query);
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            err: error,
            query,
          },
          'Failed to count permissions.',
        );

        throw error;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Registry
  // -------------------------------------------------------------------------

  isRegistered(name: string): boolean {
    return Object.hasOwn(PermissionDefinitions, name);
  }

  getDefinition(name: string): PermissionDefinition {
    const definition =
      PermissionDefinitions[name as keyof typeof PermissionDefinitions];

    if (!definition) {
      throw new PermissionNotFoundException(name);
    }

    return {
      name: name as PermissionDefinition['name'],
      ...definition,
    };
  }

  validateRegistered(name: string): void {
    const registered = this.isRegistered(name);

    this.permissionsValidatedCounter.add(1, {
      registered: String(registered),
    });

    if (!registered) {
      this.logger.warn(
        {
          permissionName: name,
        },
        'Permission is not registered.',
      );

      throw new PermissionNotFoundException(name);
    }
  }

  validateRegisteredMany(names: readonly string[]): void {
    for (const name of names) {
      this.validateRegistered(name);
    }
  }

  // -------------------------------------------------------------------------
  // Synchronization
  // -------------------------------------------------------------------------

  async synchronizeRegistry(): Promise<void> {
    return withSpan('PermissionService.synchronizeRegistry', async (span) => {
      this.logger.info(
        {
          permissionCount: Object.keys(PermissionDefinitions).length,
        },
        'Synchronizing permission registry..',
      );

      span.setAttribute(
        'permissions.registry.count',
        Object.keys(PermissionDefinitions).length,
      );

      try {
        for (const [name, definition] of Object.entries(
          PermissionDefinitions,
        )) {
          await this.permissions.upsert(
            {
              name,
            },
            {
              name,
              module: definition.module,
              description: definition.description,
            },
            {
              module: definition.module,
              description: definition.description,
            },
          );
        }

        this.permissionsSynchronizedCounter.add(1);

        span.addEvent('permissions.registry.synchronized', {
          'permissions.count': Object.keys(PermissionDefinitions).length,
        });

        this.logger.info(
          {
            permissionCount: Object.keys(PermissionDefinitions).length,
          },
          'Permission registry synchronized successfully.',
        );
      } catch (error) {
        recordException(error);

        this.logger.error(
          {
            err: error,
          },
          'Failed to synchronize permission registry.',
        );

        throw error;
      }
    });
  }
}
