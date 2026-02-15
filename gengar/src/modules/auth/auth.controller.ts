import { Controller, Post, UseGuards, Req, Get, Body, HttpStatus, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/types";
import { JwtAuth, JwtAuthGuard } from "./jwt-auth.guard";
import { GetProfileResponseDto } from "./dto/get-profile-response.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @ApiOperation({
    tags: ["Auth"],
    operationId: "Login",
    summary: "Login",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Login successful",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get("profile")
  @ApiOperation({
    tags: ["Auth"],
    operationId: "GetProfile",
    summary: "Get user profile with digital version app",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Profile retrieved successfully",
    type: GetProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() request: AuthenticatedRequest): Promise<GetProfileResponseDto> {
    return await this.authService.getProfile(request.user.id);
  }
}
