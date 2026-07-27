export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  createdBy: string;
  clientId: string;
}