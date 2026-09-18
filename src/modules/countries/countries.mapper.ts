import {
  Injectable,
} from "@nestjs/common";

import type {
  Prisma,
} from "@prisma/client";

import type {
  CountryResponseDto,
} from "./dto/country-response.dto.js";

type CountryWithCallingCodes =
  Prisma.CountryGetPayload<{
    include: {
      callingCodes: true;
    };
  }>;

@Injectable()
export class CountryMapper {

  public static toResponse(
    country:
      CountryWithCallingCodes,
  ): CountryResponseDto {

    return {

      code:
        country.code,

      name:
        country.name,

      callingCodes:
        country.callingCodes.map(
          (callingCode) =>
            callingCode.callingCode,
        ),

    };

  }

  public static toResponseList(
    countries:
      readonly CountryWithCallingCodes[],
  ): CountryResponseDto[] {

    return countries.map(
      (country) =>
        CountryMapper.toResponse(
          country,
        ),
    );

  }

}