import {
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: "Operations Administrator",
    description: "Updated role name.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly name?: string;

  @ApiPropertyOptional({
    example: "Manages operational users and messaging.",
    description: "Updated role description.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;
}