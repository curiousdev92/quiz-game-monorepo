import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminCloseController } from "./admin-close.controller";
import { JobsService } from "./jobs.service";
import { WeeklyCloseService } from "./weekly-close.service";

@Module({
  imports: [AuthModule], // AdminGuard
  controllers: [AdminCloseController],
  providers: [WeeklyCloseService, JobsService],
  exports: [WeeklyCloseService],
})
export class JobsModule {}
