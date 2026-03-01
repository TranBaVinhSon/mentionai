import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { GengarSubscriptionPlan, User } from "src/db/entities/user.entity";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { UserRepository } from "src/db/repositories/user.repository";
import { GetProfileResponseDto } from "./dto/get-profile-response.dto";
import { StripeService } from "../stripe/stripe.service";
import { AppRepository } from "src/db/repositories/app.repository";
import { AppsService } from "../apps/apps.service";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private userRepository: UserRepository,
    private stripeService: StripeService,
    private appRepository: AppRepository,
    private appsService: AppsService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const payload = { sub: loginDto.sub, email: loginDto.email };
    let userId: number;
    let subscriptionPlan;

    // TODO: Update login for multiple sources/providers
    // TODO: Verify the access token and email
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      const newUser = new User();
      newUser.avatar = loginDto.avatar;
      newUser.email = loginDto.email;
      newUser.name = loginDto.name;
      newUser.sub = loginDto.sub;
      newUser.source = loginDto.source;
      newUser.subscriptionPlan = GengarSubscriptionPlan.FREE;
      await this.userRepository.save(newUser, {
        reload: true,
      });

      userId = newUser.id;
      subscriptionPlan = GengarSubscriptionPlan.FREE;
    } else {
      user.avatar = loginDto.avatar;
      user.name = loginDto.name;
      user.sub = loginDto.sub;
      user.email = loginDto.email;
      user.source = loginDto.source;
      await this.userRepository.save(user);
      userId = user.id;
      subscriptionPlan = user.subscriptionPlan;
    }

    // Check if user has a digital twin (app with isMe: true)
    const userApp = await this.appRepository.findOne({
      where: { userId, isMe: true },
    });

    const isFirstLogin = !userApp;

    return {
      accessToken: this.jwtService.sign(payload),
      userId,
      subscriptionPlan,
      isFirstLogin,
    };
  }

  async getProfile(userId: number): Promise<GetProfileResponseDto> {
    const [user, userApp] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },
      }),
      this.appRepository.findOne({
        where: { userId, isMe: true },
      }),
    ]);

    let appDetails = null;
    if (userApp) {
      // Use the apps service to get the full app details with logo and additional info
      appDetails = await this.appsService.getAppById(userApp.id);
    }

    // Check if user has a digital twin (app with isMe: true)
    // TODO: Frontend usually call the get profile API, so returning isFirstLogin here is not correct
    // And make the UX bad because they will be redirected to the onboarding page
    const isFirstLogin = !userApp;

    return {
      subscriptionPlan: user.subscriptionPlan,
      userId,
      subscriptionPlanCancelAt: user.subscriptionPlanCancelAt,
      defaultTextModelId: user.defaultTextModelId,
      defaultImageModelId: user.defaultImageModelId,
      app: appDetails,
      isFirstLogin,
    };
  }
}
