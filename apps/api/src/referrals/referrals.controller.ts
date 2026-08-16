import { Controller, Get, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReferralsService } from "./referrals.service";

@Controller("referrals")
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  /** The caller's shareable referral code + stats. */
  @Get("me")
  me(@CurrentUser() user: JwtPayload) {
    return this.referrals.myReferral(user.sub);
  }

  /** The users this caller invited, with their activity status. */
  @Get("invitees")
  invitees(@CurrentUser() user: JwtPayload) {
    return this.referrals.invitedUsers(user.sub);
  }
}
