import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from "class-validator";

export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    format: "uuid",
    example: [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    ],
    description:
      "Complete list of permission identifiers assigned to the role.",
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  readonly permissionIds!: readonly string[];
}