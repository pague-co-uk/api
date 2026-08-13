import { ApiProperty } from "@nestjs/swagger";

export class ApiMetaDto {
  @ApiProperty({
    example: "3b9dfb35-d3e4-44dd-b784-28e6c2b41d5f",
  })
  readonly requestId!: string;

  @ApiProperty({
    example: "2026-08-09T17:35:00.000Z",
  })
  readonly timestamp!: string;
}