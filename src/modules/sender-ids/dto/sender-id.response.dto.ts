import { ApiProperty } from "@nestjs/swagger";
import { SenderIdStatus } from "@prisma/client";

export class SenderIdResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  readonly id!: string;

  @ApiProperty({
    example: "SID-001",
  })
  readonly publicId!: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  readonly clientId!: string;

  @ApiProperty({
    example: "VIBRANT",
  })
  readonly sender!: string;

  @ApiProperty({
    enum: SenderIdStatus,
    example: SenderIdStatus.APPROVED,
  })
  readonly status!: SenderIdStatus;

  @ApiProperty({
    example: true,
  })
  readonly isDefault!: boolean;

  @ApiProperty({
    example: "2026-08-13T10:00:00.000Z",
  })
  readonly createdAt!: Date;

  @ApiProperty({
    example: "2026-08-13T10:00:00.000Z",
  })
  readonly updatedAt!: Date;
}