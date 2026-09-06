import { MessageResponseDto } from "./message.response.dto.js";

export interface PlatformMessageResponseDto
  extends MessageResponseDto {
  client: {
    id: string;
    publicId: string;
    companyName: string;
    displayName: string;
  };
}