import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from "class-validator";

import {
  ApiProperty,
} from "@nestjs/swagger";

export class UpdateUserRolesDto {
  @ApiProperty({
    description: "Complete set of roles to assign to the user.",
    type: [String],
    example: [
      "0baf4a68-8c1b-46fd-9448-f5dfcbff0ef6",
      "9c833ec6-9cb7-4eb3-bd56-2d6d0afefb2b",
    ],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", {
    each: true,
  })
  readonly roleIds!: readonly string[];
}