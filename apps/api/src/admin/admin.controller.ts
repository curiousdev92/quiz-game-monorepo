import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PrizeAwardStatus } from "@prisma/client";

import { AdminGuard } from "../auth/admin.guard";
import { AdminService, type ImportRow } from "./admin.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateAwardDto } from "./dto/update-award.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";

/** Admin dashboard API. All routes require an admin JWT. */
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  stats() {
    return this.admin.stats();
  }

  // --- Question bank ---

  @Get("questions")
  listQuestions(@Query("skip") skip?: string, @Query("take") take?: string) {
    return this.admin.listQuestions(skip ? Number(skip) : 0, take ? Number(take) : 50);
  }

  @Post("questions")
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.admin.createQuestion(dto);
  }

  /** Bulk import (rows normalized client-side from CSV/Excel). */
  @Post("questions/import")
  @HttpCode(HttpStatus.OK)
  importQuestions(@Body() body: { questions?: ImportRow[] }) {
    return this.admin.importQuestions(Array.isArray(body?.questions) ? body.questions : []);
  }

  @Patch("questions/:id")
  updateQuestion(@Param("id") id: string, @Body() dto: UpdateQuestionDto) {
    return this.admin.updateQuestion(id, dto);
  }

  @Delete("questions/:id")
  deactivateQuestion(@Param("id") id: string) {
    return this.admin.deactivateQuestion(id);
  }

  // --- Prize fulfillment ---

  @Get("prize-awards")
  listAwards(@Query("weekKey") weekKey?: string) {
    return this.admin.listPrizeAwards(weekKey);
  }

  @Patch("prize-awards/:id")
  updateAward(@Param("id") id: string, @Body() dto: UpdateAwardDto): Promise<{ id: string; status: PrizeAwardStatus }> {
    return this.admin.updateAwardStatus(id, dto.status);
  }
}
