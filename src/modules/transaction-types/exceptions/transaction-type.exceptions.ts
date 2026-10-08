export class TransactionTypeNotFoundException
  extends Error {
  constructor(identifier: string) {
    super(
      `Transaction type '${identifier}' was not found.`,
    );
    this.name =
      "TransactionTypeNotFoundException";
  }
}

export class TransactionTypeAlreadyExistsException
  extends Error {
  constructor(code: string) {
    super(
      `Transaction type '${code}' already exists.`,
    );
    this.name =
      "TransactionTypeAlreadyExistsException";
  }
}