import type { Request } from "express";

import type { AuthenticatedUser } from "./authenticated-user.interface.js";
import type { AuthenticationContext } from "./authentication-contenxt.interface.js";

export interface AuthenticatedRequest
  extends Request {
  user?: AuthenticatedUser;
  auth: AuthenticationContext;
}