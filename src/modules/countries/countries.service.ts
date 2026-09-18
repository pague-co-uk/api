import {
  Injectable,
} from "@nestjs/common";

import type {
  Prisma,
} from "@prisma/client";

import {
  CountryRepository,
} from "../../repositories/country.repository.js";

type CountryWithCallingCodes =
  Prisma.CountryGetPayload<{
    include: {
      callingCodes: true;
    };
  }>;

@Injectable()
export class CountriesService {

  constructor(

    private readonly countryRepository:
      CountryRepository,

  ) { }

  public findAll(): Promise<
    CountryWithCallingCodes[]
  > {

    return this.countryRepository.findAll();

  }

}