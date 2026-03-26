import { Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { applyDecorators, UseGuards } from "@nestjs/common";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  // canActivate is called before validate
  canActivate(context: ExecutionContext) {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still try to authenticate if token is present
      // This allows optional authentication
      const request = context.switchToHttp().getRequest();
      const jwtToken = request.headers?.authorization?.split(" ")[1];

      if (jwtToken && isJwtTokenPresent(jwtToken)) {
        return super.canActivate(context);
      }
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const jwtToken = request.headers?.authorization?.split(" ")[1]; // Bearer <token>
    // const model = request.body?.model;
    const app = request.body?.app;
    const path = request?.originalUrl;

    /**
     * All requests to /internal/api/v1/completions require authentication.
     * No unauthenticated access is allowed.
     */
    if (path === "/internal/api/v1/completions" && !isJwtTokenPresent(jwtToken)) {
      return false;
    }

    // If the request is for an app, it must have a JWT token
    if (app && !isJwtTokenPresent(jwtToken)) {
      return false;
    }

    // AuthGuard("") automatically verifies the JWT
    return super.canActivate(context);
  }
}

function isJwtTokenPresent(token: string) {
  return token && token !== "null" && token !== "undefined";
}

export function JwtAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
