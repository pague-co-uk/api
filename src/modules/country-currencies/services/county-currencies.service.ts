import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { CreateCountryCurrencyDto } from "../dto/create-country-currency.dto.js";
import { FindCountryCurrenciesDto } from "../dto/find-country-currencies.dto.js";
import { UpdateCountryCurrencyDto } from "../dto/update-country-currency.dto.js";
import { CountryCurrencyMapper } from "../mappers/country-currency.mapper.js";
import {
  CountryCurrenciesRepository,
} from "../repositories/country-currencies.repository.js";

@Injectable()
export class CountryCurrenciesService {
  constructor(
    private readonly repository: CountryCurrenciesRepository,
  ) { }

  async create(
    dto: CreateCountryCurrencyDto,
  ) {
    const country =
      await this.repository.findCountryByCode(
        dto.countryCode,
      );

    if (!country) {
      throw new NotFoundException(
        `Country with code "${dto.countryCode}" was not found.`,
      );
    }

    const currency =
      await this.repository.findCurrencyById(
        dto.currencyId,
      );

    if (!currency) {
      throw new NotFoundException(
        `Currency with id "${dto.currencyId}" was not found.`,
      );
    }

    if (!currency.active) {
      throw new ConflictException(
        `Currency "${currency.code}" is disabled.`,
      );
    }

    const existing =
      await this.repository.findByCountryAndCurrency(
        dto.countryCode,
        dto.currencyId,
      );

    if (existing) {
      throw new ConflictException(
        `Currency "${currency.code}" is already configured for country "${country.name}".`,
      );
    }

    if (dto.isPrimary) {
      const existingPrimary =
        await this.repository.findPrimaryByCountry(
          dto.countryCode,
        );

      if (existingPrimary) {
        throw new ConflictException(
          `Country "${country.name}" already has a primary currency.`,
        );
      }
    }

    const relationship =
      await this.repository.create({
        country: {
          connect: {
            code: dto.countryCode,
          },
        },
        currency: {
          connect: {
            id: dto.currencyId,
          },
        },
        isPrimary: dto.isPrimary,
        isOfficial: dto.isOfficial,
      });

    const result =
      await this.repository.findByCountryAndCurrencyWithRelations(
        dto.countryCode,
        relationship.currencyId,
      );

    if (!result) {
      throw new NotFoundException(
        "The created country-currency relationship could not be retrieved.",
      );
    }

    return CountryCurrencyMapper.toResponse(
      result,
    );
  }

  async findByCountryAndCurrency(
    countryCode: string,
    currencyId: string,
  ) {
    const relationship =
      await this.repository.findByCountryAndCurrencyWithRelations(
        countryCode,
        currencyId,
      );

    if (!relationship) {
      throw new NotFoundException(
        `Currency "${currencyId}" is not configured for country "${countryCode}".`,
      );
    }

    return CountryCurrencyMapper.toResponse(
      relationship,
    );
  }

  async findMany(
    dto: FindCountryCurrenciesDto,
  ) {
    const isPrimary =
      dto.isPrimary !== undefined
        ? dto.isPrimary === "true"
        : undefined;

    const isOfficial =
      dto.isOfficial !== undefined
        ? dto.isOfficial === "true"
        : undefined;

    const orderBy =
      this.buildOrderBy(dto.sort);

    const page =
      await this.repository.findManyPlatform({
        page: dto.page,
        pageSize: dto.pageSize,
        countryCode: dto.countryCode,
        currencyId: dto.currencyId,
        isPrimary,
        isOfficial,
        search: dto.search,
        orderBy,
      });

    const totalPages = Math.ceil(
      page.totalItems /
      page.pageSize,
    );

    return {
      items:
        CountryCurrencyMapper.toResponseList(
          page.items,
        ),
      page: page.page,
      pageSize: page.pageSize,
      totalItems: page.totalItems,
      totalPages,
      hasNext:
        page.page < totalPages,
      hasPrevious:
        page.page > 1,
    };
  }

  async update(
    countryCode: string,
    currencyId: string,
    dto: UpdateCountryCurrencyDto,
  ) {
    const existing =
      await this.repository.findByCountryAndCurrency(
        countryCode,
        currencyId,
      );

    if (!existing) {
      throw new NotFoundException(
        `Currency "${currencyId}" is not configured for country "${countryCode}".`,
      );
    }

    if (
      dto.isPrimary === true &&
      !existing.isPrimary
    ) {
      const existingPrimary =
        await this.repository.findPrimaryByCountry(
          countryCode,
        );

      if (
        existingPrimary &&
        existingPrimary.currencyId !==
        currencyId
      ) {
        throw new ConflictException(
          `Country "${countryCode}" already has another primary currency.`,
        );
      }
    }

    const data: Prisma.CountryCurrencyUpdateInput =
      {};

    if (dto.isPrimary !== undefined) {
      data.isPrimary =
        dto.isPrimary;
    }

    if (dto.isOfficial !== undefined) {
      data.isOfficial =
        dto.isOfficial;
    }

    const relationship =
      await this.repository.update(
        countryCode,
        currencyId,
        data,
      );

    const result =
      await this.repository.findByCountryAndCurrencyWithRelations(
        countryCode,
        relationship.currencyId,
      );

    if (!result) {
      throw new NotFoundException(
        "The updated country-currency relationship could not be retrieved.",
      );
    }

    return CountryCurrencyMapper.toResponse(
      result,
    );
  }

  async delete(
    countryCode: string,
    currencyId: string,
  ) {
    const existing =
      await this.repository.findByCountryAndCurrency(
        countryCode,
        currencyId,
      );

    if (!existing) {
      throw new NotFoundException(
        `Currency "${currencyId}" is not configured for country "${countryCode}".`,
      );
    }

    await this.repository.delete(
      countryCode,
      currencyId,
    );

    return {
      countryCode,
      currencyId,
      deleted: true,
    };
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.CountryCurrencyOrderByWithRelationInput[] {
    if (!sort) {
      return [
        {
          createdAt: "desc",
        },
      ];
    }

    const orderBy: Prisma.CountryCurrencyOrderByWithRelationInput[] =
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
        case "isPrimary":
        case "isOfficial":
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