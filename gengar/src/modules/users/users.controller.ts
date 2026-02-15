import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuthenticatedRequest } from "../common/types";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(":id")
  @ApiOperation({
    tags: ["Users"],
    operationId: "updateUser",
    summary: "Update user",
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async updateUser(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpdateUserDto,
    @Param("id", ParseIntPipe) id: number,
  ) {
    if (request.user.id !== id) {
      throw new ForbiddenException();
    }
    await this.usersService.updateUser(request.user, body);
  }
}
