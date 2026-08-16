import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { getWeekKey } from "../common/week-key";
import { PrizesService } from "./prizes.service";

@Controller("prizes")
export class PrizesController {
  constructor(private readonly prizes: PrizesService) {}

  /** All configured prizes (public). */
  @Get()
  list() {
    return this.prizes.list();
  }

  /** Preview the prize the caller would win at their current weekly rank. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  preview(@CurrentUser() user: JwtPayload, @Query("weekKey") weekKey?: string) {
    return this.prizes.previewForUser(user.sub, weekKey ?? getWeekKey());
  }

  /** Prizes actually awarded to the caller. */
  @Get("me/awards")
  @UseGuards(JwtAuthGuard)
  awards(@CurrentUser() user: JwtPayload) {
    return this.prizes.myAwards(user.sub);
  }
}
