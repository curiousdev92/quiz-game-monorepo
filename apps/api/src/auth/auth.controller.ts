import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { AuthService, JwtPayload } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  /** Step 1: send an OTP to the phone (and stash UTM/referral for signup). */
  @Post("request-otp")
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto): Promise<{ sent: true; ttlSeconds: number }> {
    return this.auth.requestOtp(dto);
  }

  /** Step 2: verify the OTP, create-or-fetch the user, return a JWT. */
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  /** Current authenticated user. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, displayName: true, isAdmin: true, createdAt: true, referredById: true },
    });
    return user;
  }
}
