import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

export class RoleSummaryResponseDto {
  @ApiProperty({
    format: "uuid",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  readonly id!: string;

  @ApiProperty({
    example: "Administrator",
  })
  readonly name!: string;

  @ApiPropertyOptional({
    example: "Full system administrator.",
    nullable: true,
  })
  readonly description!: string | null;
}
