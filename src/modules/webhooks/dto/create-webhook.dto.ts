import {
  IsString,
  IsUrl,
  Length,
} from "class-validator";

export class CreateWebhookDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsUrl({
    require_protocol: true,
  })
  @Length(1, 2048)
  url!: string;
}