import { ApiProperty } from "@nestjs/swagger";

import { ApiMetaDto } from "./api-meta.interface.js";
import { ApiPaginationDto } from "./api-pagination.interface.js";

export class ApiCollectionResponseDto<T = unknown> {
  @ApiProperty({
    example: true,
    description: "Indicates whether the request was successful.",
  })
  readonly success!: boolean;

  readonly data!: T[];

  @ApiProperty({
    type: ApiMetaDto,
  })
  readonly meta!: ApiMetaDto;

  @ApiProperty({
    type: ApiPaginationDto,
  })
  readonly pagination!: ApiPaginationDto;
}