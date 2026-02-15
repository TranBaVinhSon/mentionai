import { User } from "src/db/entities/user.entity";

export interface AuthenticatedRequest extends Request {
  originalUrl: string;
  method: string;
  user: User;
}
