import { ApiProperty } from "@nestjs/swagger";

export class UserSummaryResponseDto {
  @ApiProperty({
    description: "Unique identifier of the user.",
    example: "01J3WZ6V6Q2R1W9G5M8A7B3C4D",
  })
  id!: string;

  @ApiProperty({
    description: "Unique identifier of the client the user belongs to.",
    example: "01J3WZ6V6Q2R1W9G5M8A7B3C4D",
  })
  clientId!: string;

  @ApiProperty({
    description: "Username.",
    example: "jdoe",
  })
  username!: string;

  @ApiProperty({
    description: "Email address.",
    example: "john.doe@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "User's first name.",
    example: "John",
  })
  firstName!: string;

  @ApiProperty({
    description: "User's last name.",
    example: "Doe",
  })
  lastName!: string;

  @ApiProperty({
    description: "Whether the user account is active.",
    example: true,
  })
  active!: boolean;

  @ApiProperty({
    description: "Whether the user account is currently locked.",
    example: false,
  })
  locked!: boolean;

  @ApiProperty({
    description: "Whether multi-factor authentication is enabled.",
    example: true,
  })
  mfaEnabled!: boolean;
}