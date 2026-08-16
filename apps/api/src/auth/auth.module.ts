import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { SmsModule } from "../sms/sms.module";
import { AdminGuard } from "./admin.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OtpService } from "./otp.service";

@Module({
  imports: [
    PrismaModule,
    SmsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        // `ms`-style string (e.g. "7d"); cast since JwtSignOptions types it as a branded string.
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "7d") as unknown as number },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtAuthGuard, AdminGuard],
  exports: [JwtAuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
