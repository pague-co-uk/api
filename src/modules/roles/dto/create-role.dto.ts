import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateRoleDto {
  @ApiProperty({
    example: "Administrator",
    description: "Unique role name.",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @ApiPropertyOptional({
    example: "Full system administrator.",
    description: "Description of the role.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;
}