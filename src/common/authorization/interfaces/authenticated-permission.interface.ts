export interface AuthenticatedPermission {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly module: string;
}