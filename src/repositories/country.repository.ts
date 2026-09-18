import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  Country,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { DATABASE } from "../database/database.constants.js";

import {
  DatabaseRepository,
} from "../database/database.repository.js";

type CountryWithCallingCodes =
  Prisma.CountryGetPayload<{
    include: {
      callingCodes: true;
    };
  }>;

@Injectable()
export class CountryRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db: PrismaClient | Prisma.TransactionClient,
  ) {
    super(db);
  }

  public withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new CountryRepository(
      db,
    ) as this;
  }

  // =========================================================================
  // Find
  // =========================================================================

  findById(
    id: string,
  ): Promise<Country | null> {
    return this.execute(
      "SELECT",
      "countries",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              id,
            },
          });

        return {
          result: country,
          rowsAffected:
            country ? 1 : 0,
        };
      },
    );
  }

  findByCode(
    code: string,
  ): Promise<Country | null> {
    return this.execute(
      "SELECT",
      "countries",
      async () => {
        const country =
          await this.db.country.findUnique({
            where: {
              code,
            },
          });

        return {
          result: country,
          rowsAffected:
            country ? 1 : 0,
        };
      },
    );
  }

  // =========================================================================
  // Country Calling Code
  // =========================================================================

  findCountryForDestination(
    destination: string,
  ): Promise<Country | null> {
    return this.execute(
      "SELECT",
      "country_calling_codes",
      async () => {
        /*
         * Calling codes vary in length and some are shared by multiple
         * countries/geographical areas.
         *
         * We therefore resolve the longest matching calling code rather than
         * assuming that the first few digits uniquely identify a country.
         */

        const callingCodes =
          await this.db.countryCallingCode.findMany({
            include: {
              country: true,
            },
          });

        const matches =
          callingCodes
            .filter(
              (entry) =>
                destination.startsWith(
                  entry.callingCode,
                ),
            )
            .sort(
              (a, b) =>
                b.callingCode.length -
                a.callingCode.length,
            );

        if (
          matches.length === 0
        ) {
          return {
            result: null,
            rowsAffected: 0,
          };
        }

        return {
          result: matches[0].country,
          rowsAffected: 1,
        };
      },
    );
  }

  public findAll(): Promise<
    CountryWithCallingCodes[]
  > {
    return this.execute(
      "SELECT",
      "countries",
      async () => {

        const result =
          await this.db.country.findMany({
            include: {
              callingCodes: true,
            },
            orderBy: {
              name: "asc",
            },
          });

        return {
          result,
        };

      },
    );
  }
}