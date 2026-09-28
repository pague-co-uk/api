import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  @ApiProperty({
    example: 50,
    description:
      "Privilege priority of the role. Higher values represent greater privilege.",
  })
  @IsInt()
  @Min(0)
  @Max(1000)
  readonly priority!: number;
}