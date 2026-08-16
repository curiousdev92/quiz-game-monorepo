import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  /** All active quests with the caller's state + progress. */
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.quests.listForUser(user.sub);
  }

  /** Mark that the caller opened the quest's task link — starts the honor-system dwell timer. */
  @Post(":id/open")
  @HttpCode(HttpStatus.OK)
  open(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.quests.markOpened(user.sub, id);
  }

  /** Collect a quest's reward (adds its score to the caller's total). */
  @Post(":id/collect")
  @HttpCode(HttpStatus.OK)
  collect(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.quests.collect(user.sub, id);
  }

  /** Redeem a shop-access quest: grant external SKU access (by phone), then award the reward. */
  @Post(":id/redeem")
  @HttpCode(HttpStatus.OK)
  redeem(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.quests.redeemShopAccess(user.sub, id);
  }
}
