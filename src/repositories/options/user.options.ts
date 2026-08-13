import {
  UserStatus,
} from "@prisma/client";
import type { QueryOptions } from "../../common/query/query-options.interface.js";

export type UserSortField =
  | "createdAt"
  | "updatedAt"
  | "username"
  | "email"
  | "firstName"
  | "lastName";

export interface UserFilters {
  readonly clientId?: string;

  readonly status?: UserStatus;
}

export type UserQueryOptions = QueryOptions<
  UserSortField,
  UserFilters
>;
