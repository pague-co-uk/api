import { ApiProperty } from "@nestjs/swagger";

export class ApiPaginationDto {
  @ApiProperty()
  readonly page!: number;

  @ApiProperty()
  readonly pageSize!: number;

  @ApiProperty()
  readonly totalItems!: number;

  @ApiProperty()
  readonly totalPages!: number;

  @ApiProperty()
  readonly hasNext!: boolean;

  @ApiProperty()
  readonly hasPrevious!: boolean;
}