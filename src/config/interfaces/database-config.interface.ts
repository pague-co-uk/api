import { Prisma } from "@prisma/client";

export interface DatabaseConfig {
  readonly url: string;

  readonly log: Prisma.LogLevel[];
}