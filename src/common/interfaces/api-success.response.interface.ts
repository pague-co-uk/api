import { ApiProperty } from "@nestjs/swagger";

import { ApiMetaDto } from "./api-meta.interface.js";

export class ApiSuccessResponseDto<T = unknown> {
  @ApiProperty({
    example: true,
    description: "Indicates whether the request was successful.",
  })
  readonly success!: boolean;

  readonly data!: T;

  @ApiProperty({
    type: ApiMetaDto,
  })
  readonly meta!: ApiMetaDto;
}