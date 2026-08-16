import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./auth.service";
import { AuthedRequest } from "./jwt-auth.guard";

/** Bearer JWT + User.isAdmin. Use on every admin route. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("ابتدا وارد حساب خود شوید");
    }
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(header.slice("Bearer ".length));
    } catch {
      throw new UnauthorizedException("نشست شما منقضی شده است؛ دوباره وارد شوید");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      throw new ForbiddenException("دسترسی مدیر لازم است");
    }
    req.user = payload;
    return true;
  }
}
