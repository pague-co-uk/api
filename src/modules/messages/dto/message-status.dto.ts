import {
  ApiProperty,
} from "@nestjs/swagger";

import {
  MessageStatus,
} from "@prisma/client";

export class MessageStatusResponseDto {
  @ApiProperty({
    description:
      "Public identifier of the message.",
    example:
      "aBc123XyZ",
  })
  publicId!: string;

  @ApiProperty({
    description:
      "Current status of the message.",
    enum:
      MessageStatus,
    example:
      MessageStatus.DELIVERED,
  })
  status!: MessageStatus;
}