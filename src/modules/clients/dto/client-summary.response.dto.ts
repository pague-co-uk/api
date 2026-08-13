import { ApiProperty } from "@nestjs/swagger";
import { ClientStatus } from "@prisma/client";

export class ClientSummaryResponseDto {
  @ApiProperty({
    example: "CLT_01HXYZ123456",
  })
  readonly publicId!: string;

  @ApiProperty({
    example: "Vibrant Systems Limited",
  })
  readonly companyName!: string;

  @ApiProperty({
    example: "Vibrant Systems",
  })
  readonly displayName!: string;

  @ApiProperty({
    example: "admin@vibrantsystems.com",
  })
  readonly email!: string;

  @ApiProperty({
    enum: ClientStatus,
    example: ClientStatus.ACTIVE,
  })
  readonly status!: ClientStatus;

  @ApiProperty({
    example: "2026-08-13T08:00:00.000Z",
  })
  readonly createdAt!: Date;
}