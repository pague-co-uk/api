import {
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  Type,
} from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { UserStatus } from "@prisma/client";
import type { SortDirection } from "../../../common/query/sort.interface.js";
import type {
  UserQueryOptions,
  UserSortField,
} from "../../../repositories/options/user.options.js";

const userSortFields = [
  "createdAt",
  "updatedAt",
  "username",
  "email",
  "firstName",
  "lastName",
] as const satisfies readonly UserSortField[];

export class FindUsersDto {
  @ApiPropertyOptional({
    description: "Search by username, email or name.",
    example: "john",
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: "Filter by user status.",
  })
  @IsOptional()
  @IsEnum(UserStatus)
  readonly status?: UserStatus;

  @ApiPropertyOptional({
    description: "Page number.",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page = 1;

  @ApiPropertyOptional({
    description: "Number of records per page.",
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize = 20;

  @ApiPropertyOptional({
    description: "Sort field.",
    example: "username",
  })
  @IsOptional()
  @IsIn(userSortFields)
  readonly sortBy?: UserSortField;

  @ApiPropertyOptional({
    enum: ["asc", "desc"],
    default: "asc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  readonly sortDirection: SortDirection = "asc";

  toQueryOptions(): UserQueryOptions {
    return {
      page: this.page,
      pageSize: this.pageSize,
      ...(this.search && {
        search: this.search,
      }),
      ...(this.status && {
        filters: {
          status: this.status,
        },
      }),
      ...(this.sortBy && {
        sort: {
          field: this.sortBy,
          direction: this.sortDirection,
        },
      }),
    };
  }
}
