import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { JwtPayload } from "./auth.service";

// Minimal shape we read off the request — avoids a hard dep on @types/express.
export interface AuthedRequest {
  headers: { authorization?: string };
  user?: JwtPayload;
}

/** Validates a `Bearer <jwt>` header and attaches the decoded payload to req.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("ابتدا وارد حساب خود شوید");
    }
    const token = header.slice("Bearer ".length);
    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException("نشست شما منقضی شده است؛ دوباره وارد شوید");
    }
  }
}
