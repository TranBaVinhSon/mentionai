import { Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../users/users.service";
import { AuthenticatedRequest } from "../common/types";
import { AVAILABLE_MODELS } from "src/config/constants";
import { GengarSubscriptionPlan } from "src/db/entities/user.entity";
import { extractModelsFromRequest, isContainsProModels } from "../common/utils";

export interface JwtPayload {
  sub: number;
  email?: string;
}

interface RequestBody {
  models?: string;
  app?: string;
  messages?: [
    {
      role: string;
      content: string;
    },
  ];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly blacklistedUserIds: number[] = [114, 115];

  constructor(private readonly configService: ConfigService, private readonly usersService: UsersService) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("jwt_secret", { infer: true }),
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedRequest["user"]> {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is blacklisted
    if (this.blacklistedUserIds.includes(user.id)) {
      console.error(`[BLACKLIST] Blocked access attempt from blacklisted user ID: ${user.id}, email: ${payload.email}`);
      throw new ForbiddenException(
        "Access denied. Your account has been suspended due to violation of terms of service.",
      );
    }

    (req as AuthenticatedRequest).user = user;

    const authenticatedRequest = req as AuthenticatedRequest;

    // Only check for Plus model access if the request is for a internal/api/v1/completions endpoint
    const originalUrl = authenticatedRequest.originalUrl as string;
    const method = authenticatedRequest.method;
    if (method == "POST" && originalUrl.includes("internal/api/v1/completions")) {
      const body = authenticatedRequest.body as RequestBody;
      const models = body?.models;
      const messages = body?.messages;
      const latestContent = messages?.[messages.length - 1]?.content;
      const extractedModels = extractModelsFromRequest(latestContent);
      // console.log("extractedModels", extractedModels);

      // TODO:check if the model is inside the messages

      for (const model of models) {
        const availableModel = AVAILABLE_MODELS.find((m) => m.name === model);
        if (
          ((availableModel && availableModel.isProModel) || isContainsProModels(extractedModels)) &&
          user.subscriptionPlan !== GengarSubscriptionPlan.PLUS &&
          originalUrl.includes("internal/api/v1/completions")
        ) {
          throw new UnauthorizedException("User doesn't have access to the Plus model");
        }
      }
    }

    return user;
  }
}
