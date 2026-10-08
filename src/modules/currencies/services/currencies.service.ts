import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { CreateCurrencyDto } from "../dto/create-currency.dto.js";
import { FindCurrenciesDto } from "../dto/find-currencies.dto.js";
import { UpdateCurrencyDto } from "../dto/update-currency.dto.js";
import { CurrencyMapper } from "../mappers/currencies.mapper.js";
import { CurrenciesRepository } from "../repositories/currencies.repository.js";

@Injectable()
export class CurrenciesService {
  constructor(
    private readonly repository: CurrenciesRepository,
  ) { }

  async create(
    dto: CreateCurrencyDto,
  ) {
    const code =
      dto.code.trim().toUpperCase();

    const existingByCode =
      await this.repository.findByCode(
        code,
      );

    if (existingByCode) {
      throw new ConflictException(
        `Currency with code "${code}" already exists.`,
      );
    }

    if (dto.numericCode) {
      const numericCode =
        dto.numericCode.trim();

      const existingByNumericCode =
        await this.repository.findByNumericCode(
          numericCode,
        );

      if (existingByNumericCode) {
        throw new ConflictException(
          `Currency with numeric code "${numericCode}" already exists.`,
        );
      }
    }

    const currency =
      await this.repository.create({
        code,
        ...(dto.numericCode !== undefined
          ? {
            numericCode:
              dto.numericCode.trim(),
          }
          : {}),
        name: dto.name.trim(),
        ...(dto.symbol !== undefined
          ? {
            symbol: dto.symbol.trim(),
          }
          : {}),
        decimalDigits:
          dto.decimalDigits,
        active: true,
      });

    return CurrencyMapper.toResponse(
      currency,
    );
  }

  async findById(id: string) {
    const currency =
      await this.repository.findById(id);

    if (!currency) {
      throw new NotFoundException(
        `Currency with id "${id}" was not found.`,
      );
    }

    return CurrencyMapper.toResponse(
      currency,
    );
  }

  async findMany(
    dto: FindCurrenciesDto,
  ) {
    const active =
      dto.active !== undefined
        ? dto.active === "true"
        : undefined;

    const orderBy =
      this.buildOrderBy(dto.sort);

    const page =
      await this.repository.findManyPlatform(
        {
          page: dto.page,
          pageSize: dto.pageSize,
          active,
          search: dto.search,
          orderBy,
        },
      );

    return {
      items:
        CurrencyMapper.toResponseList(
          page.items,
        ),
      page: page.page,
      pageSize: page.pageSize,
      totalItems: page.totalItems,
      totalPages: Math.ceil(
        page.totalItems /
        page.pageSize,
      ),
      hasNext:
        page.page <
        Math.ceil(
          page.totalItems /
          page.pageSize,
        ),
      hasPrevious:
        page.page > 1,
    };
  }

  async update(
    id: string,
    dto: UpdateCurrencyDto,
  ) {
    const existing =
      await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException(
        `Currency with id "${id}" was not found.`,
      );
    }

    const data: Prisma.CurrencyUpdateInput =
      {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.symbol !== undefined) {
      data.symbol = dto.symbol.trim();
    }

    if (
      dto.decimalDigits !== undefined
    ) {
      data.decimalDigits =
        dto.decimalDigits;
    }

    const currency =
      await this.repository.update(
        id,
        data,
      );

    return CurrencyMapper.toResponse(
      currency,
    );
  }

  async enable(id: string) {
    const currency =
      await this.repository.findById(id);

    if (!currency) {
      throw new NotFoundException(
        `Currency with id "${id}" was not found.`,
      );
    }

    if (currency.active) {
      return CurrencyMapper.toResponse(
        currency,
      );
    }

    const updated =
      await this.repository.update(id, {
        active: true,
      });

    return CurrencyMapper.toResponse(
      updated,
    );
  }

  async disable(id: string) {
    const currency =
      await this.repository.findById(id);

    if (!currency) {
      throw new NotFoundException(
        `Currency with id "${id}" was not found.`,
      );
    }

    if (!currency.active) {
      return CurrencyMapper.toResponse(
        currency,
      );
    }

    const updated =
      await this.repository.update(id, {
        active: false,
      });

    return CurrencyMapper.toResponse(
      updated,
    );
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.CurrencyOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const orderBy: Prisma.CurrencyOrderByWithRelationInput[] =
      [];

    for (const expression of sort
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      const descending =
        expression.startsWith("-");

      const field = descending
        ? expression.slice(1)
        : expression;

      switch (field) {
        case "code":
        case "numericCode":
        case "name":
        case "symbol":
        case "decimalDigits":
        case "active":
        case "createdAt":
        case "updatedAt":
          orderBy.push({
            [field]:
              descending
                ? "desc"
                : "asc",
          });
          break;

        default:
          throw new ConflictException(
            `Invalid sort field "${field}".`,
          );
      }
    }

    return orderBy.length > 0
      ? orderBy
      : [
        {
          createdAt: "desc",
        },
      ];
  }
}