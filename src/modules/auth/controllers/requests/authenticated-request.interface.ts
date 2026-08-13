import { AuthenticatedUser } from "../../../../common/authorization/interfaces/authenticated-user.interface.js";
import { AuthenticationContext } from "../../../../common/authorization/interfaces/authentication-contenxt.interface.js";

export interface AuthenticatedRequest
  extends Request {
  user: AuthenticatedUser;
  auth: AuthenticationContext;
}