import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { JwtPayload } from "./auth.service";
import { AuthedRequest } from "./jwt-auth.guard";

/** Injects the JWT payload attached by JwtAuthGuard. Use on guarded routes only. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});
