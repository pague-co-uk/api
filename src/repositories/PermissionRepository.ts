import { Inject, Injectable } from '@nestjs/common';
import { Permission, Prisma, PrismaClient } from '@prisma/client';

import type { Page } from '../common/query/page.interface.js';
import { DATABASE } from '../database/database.constants.js';
import { DatabaseRepository } from '../database/database.repository.js';
import type { PermissionQueryOptions } from './options/permission.options.js';

@Injectable()
export class PermissionRepository extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(db: Prisma.TransactionClient): this {
    return new PermissionRepository(db) as this;
  }

  create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.execute('INSERT', 'permissions', async () => ({
      result: await this.db.permission.create({
        data,
      }),
      rowsAffected: 1,
    }));
  }

  findById(id: string): Promise<Permission | null> {
    return this.execute('SELECT', 'permissions', async () => {
      const permission = await this.db.permission.findUnique({
        where: {
          id,
        },
      });

      return {
        result: permission,
        rowsAffected: permission ? 1 : 0,
      };
    });
  }

  findByIds(ids: readonly string[]): Promise<Permission[]> {
    const uniqueIds = [...new Set(ids)];

    return this.execute('SELECT', 'permissions', async () => {
      if (uniqueIds.length === 0) {
        return {
          result: [],
          rowsAffected: 0,
        };
      }

      const permissions = await this.db.permission.findMany({
        where: {
          id: {
            in: uniqueIds,
          },
        },
      });

      return {
        result: permissions,
        rowsAffected: permissions.length,
      };
    });
  }

  findByName(name: string): Promise<Permission | null> {
    return this.execute('SELECT', 'permissions', async () => {
      const permission = await this.db.permission.findUnique({
        where: {
          name,
        },
      });

      return {
        result: permission,
        rowsAffected: permission ? 1 : 0,
      };
    });
  }

  findMany(query: PermissionQueryOptions): Promise<Page<Permission>> {
    const where = this.buildWhereClause(query);

    return this.execute('SELECT', 'permissions', async () => {
      const [items, totalItems] = await Promise.all([
        this.db.permission.findMany({
          where,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          orderBy: [
            {
              module: 'asc',
            },
            {
              name: 'asc',
            },
          ],
        }),
        this.db.permission.count({ where }),
      ]);

      return {
        result: {
          items,
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
        },
        rowsAffected: items.length,
      };
    });
  }

  count(options?: { module?: string; search?: string }): Promise<number> {
    const where = this.buildWhereClause(options ?? {});

    return this.execute('SELECT', 'permissions', async () => {
      const count = await this.db.permission.count({
        where,
      });

      return {
        result: count,
        rowsAffected: count,
      };
    });
  }

  private buildWhereClause(
    options: Pick<PermissionQueryOptions, 'module' | 'search'>,
  ): Prisma.PermissionWhereInput {
    const where: Prisma.PermissionWhereInput = {};

    if (options.module) {
      where.module = options.module;
    }

    if (options.search) {
      where.OR = [
        {
          name: {
            contains: options.search,
          },
        },
        {
          description: {
            contains: options.search,
          },
        },
      ];
    }

    return where;
  }

  existsByName(name: string): Promise<boolean> {
    return this.execute('SELECT', 'permissions', async () => {
      const permission = await this.db.permission.findUnique({
        where: {
          name,
        },
        select: {
          id: true,
        },
      });

      return {
        result: permission !== null,
        rowsAffected: permission ? 1 : 0,
      };
    });
  }

  upsert(
    where: Prisma.PermissionWhereUniqueInput,
    create: Prisma.PermissionCreateInput,
    update: Prisma.PermissionUpdateInput,
  ): Promise<Permission> {
    return this.execute('UPSERT', 'permissions', async () => ({
      result: await this.db.permission.upsert({
        where,
        create,
        update,
      }),
      rowsAffected: 1,
    }));
  }

  update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.execute('UPDATE', 'permissions', async () => ({
      result: await this.db.permission.update({
        where: {
          id,
        },
        data,
      }),
      rowsAffected: 1,
    }));
  }

  delete(id: string): Promise<Permission> {
    return this.execute('DELETE', 'permissions', async () => ({
      result: await this.db.permission.delete({
        where: {
          id,
        },
      }),
      rowsAffected: 1,
    }));
  }
}
