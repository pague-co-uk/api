import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponseDto {
  @ApiProperty({
    format: "uuid",
    description: "Permission identifier.",
  })
  readonly id!: string;

  @ApiProperty({
    example: "users.read",
    description: "Permission name.",
  })
  readonly name!: string;

  @ApiProperty({
    example: "Read users and retrieve user information.",
    nullable: true,
  })
  readonly description!: string | null;

  @ApiProperty({
    example: "users",
    description: "Functional module owning the permission.",
  })
  readonly module!: string;
}