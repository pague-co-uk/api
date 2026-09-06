export interface ClientScopeContext {
  readonly authenticatedClientId: string;
  readonly requestedClientId?: string;
}