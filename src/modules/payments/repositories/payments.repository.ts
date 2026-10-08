import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { DATABASE } from "../../../database/database.constants.js";
import { DatabaseRepository } from "../../../database/database.repository.js";



@Injectable()
export class PaymentsRepository
  extends DatabaseRepository {
  constructor(
    @Inject(DATABASE)
    db:
      | PrismaClient
      | Prisma.TransactionClient,
  ) {
    super(db);
  }

  withDatabase(
    db: Prisma.TransactionClient,
  ): this {
    return new PaymentsRepository(
      db,
    ) as this;
  }

  async findServiceByCode(
    code: string,
  ) {
    return this.execute(
      "SELECT",
      "services",
      async () => {
        const result =
          await this.db.service.findUnique({
            where: {
              code,
            },
          });

        return {
          result,
        };
      },
    );
  }

  async findClientService(
    clientId: string,
    serviceId: string,
  ) {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const result =
          await this.db.clientService.findUnique({
            where: {
              clientId_serviceId: {
                clientId,
                serviceId,
              },
            },
          });

        return {
          result,
        };
      },
    );
  }

  async findClientServiceByServiceCode(
    clientId: string,
    serviceCode: string,
  ) {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const result =
          await this.db.clientService.findFirst({
            where: {
              clientId,
              service: {
                code: serviceCode,
              },
            },
            include: {
              service: true,
            },
          });

        return {
          result,
        };
      },
    );
  }

  async findByClientAndServiceCode(
    clientId: string,
    serviceCode: string,
  ) {
    return this.execute(
      "SELECT",
      "client_services",
      async () => {
        const result =
          await this.db.clientService.findFirst({
            where: {
              clientId,
              service: {
                code: serviceCode,
              },
            },
            include: {
              service: true,
            },
          });

        return {
          result,
        };
      },
    );
  }

  async findActiveCurrencyByCode(
    code: string,
  ) {
    return this.execute(
      "SELECT",
      "currencies",
      async () => {
        const result =
          await this.db.currency.findFirst({
            where: {
              code,
              active: true,
            },
          });

        return {
          result,
        };
      },
    );
  }

  async findActiveTransactionTypeByCode(
    code: string,
  ) {
    return this.execute(
      "SELECT",
      "transaction_types",
      async () => {
        const result =
          await this.db.transactionType.findFirst({
            where: {
              code,
              active: true,
            },
          });

        return {
          result,
        };
      },
    );
  }

  async createTransaction(
    data: Prisma.TransactionCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "transactions",
      async () => {
        const result =
          await this.db.transaction.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }

  async findByClientAndId(
    clientId: string,
    id: string,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const result =
          await this.db.transaction.findFirst({
            where: {
              clientId,
              publicId: id,
            },
          });

        return { result };
      },
    );
  }

  async findByClientAndReference(
    clientId: string,
    reference: string,
  ) {
    return this.execute(
      "SELECT",
      "transactions",
      async () => {
        const result =
          await this.db.transaction.findUnique({
            where: {
              clientId_reference: {
                clientId,
                reference,
              },
            },
          });

        return {
          result,
        };
      },
    );
  }

  async createOutboxEvent(
    data: Prisma.OutboxEventCreateInput,
  ) {
    return this.execute(
      "INSERT",
      "outbox_events",
      async () => {
        const result =
          await this.db.outboxEvent.create({
            data,
          });

        return {
          result,
          rowsAffected: 1,
        };
      },
    );
  }
}