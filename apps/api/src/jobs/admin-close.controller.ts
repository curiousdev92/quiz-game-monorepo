import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { AdminGuard } from "../auth/admin.guard";
import { CloseWeekDto } from "./dto/close-week.dto";
import { JobsService } from "./jobs.service";
import { WeeklyCloseService, previousWeekKey } from "./weekly-close.service";

/** Manually trigger a weekly close (the cron does it automatically each Monday). */
@Controller("admin/close-week")
@UseGuards(AdminGuard)
export class AdminCloseController {
  constructor(
    private readonly jobs: JobsService,
    private readonly weeklyClose: WeeklyCloseService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async close(@Body() dto: CloseWeekDto) {
    const weekKey = dto.weekKey ?? previousWeekKey();
    if (dto.sync) {
      return { mode: "sync", ...(await this.weeklyClose.close(weekKey)) };
    }
    const jobId = await this.jobs.enqueue(weekKey);
    return { mode: "queued", weekKey, jobId };
  }
}
