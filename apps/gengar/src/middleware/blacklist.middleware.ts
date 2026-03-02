import { Injectable, NestMiddleware, ForbiddenException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
  };
}

@Injectable()
export class BlacklistMiddleware implements NestMiddleware {
  private readonly blacklistedUserIds: number[];

  constructor(private configService: ConfigService) {
    // Hardcoded blacklist for now, can be moved to config or database later
    this.blacklistedUserIds = [114]; // User ID 114 who attempted DDoS attacks
  }

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Check if user is authenticated and has an ID
    if (req.user && req.user.id) {
      // Check if user is in the blacklist
      if (this.blacklistedUserIds.includes(req.user.id)) {
        // Log the blocked attempt
        console.error(
          `[BLACKLIST] Blocked access attempt from blacklisted user ID: ${req.user.id}, IP: ${req.ip}, Path: ${req.path}`,
        );

        // Throw a forbidden exception
        throw new ForbiddenException(
          "Access denied. Your account has been suspended due to violation of terms of service.",
        );
      }
    }

    // If not blacklisted or not authenticated, continue
    next();
  }
}
