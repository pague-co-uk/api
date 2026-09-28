import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";

import {
  Observable,
} from "rxjs";

import {
  map,
} from "rxjs/operators";

@Injectable()
export class BigIntSerializationInterceptor
  implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) =>
        this.serialize(
          value,
        ),
      ),
    );
  }

  private serialize(
    value: unknown,
  ): unknown {
    if (
      typeof value ===
      "bigint"
    ) {
      return Number(value);
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        (item) =>
          this.serialize(
            item,
          ),
      );
    }

    if (
      value !== null &&
      typeof value ===
      "object"
    ) {
      const result: Record<
        string,
        unknown
      > = {};

      for (
        const [
          key,
          item,
        ] of Object.entries(
          value,
        )
      ) {
        result[key] =
          this.serialize(
            item,
          );
      }

      return result;
    }

    return value;
  }
}