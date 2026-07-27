import { User } from "@prisma/client";

export interface ChangePasswordRequest {
  user: User;
  currentPassword: string;
  newPassword: string;
}