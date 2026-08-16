import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PrizeAwardStatus, RoundStatus } from "@prisma/client";

import { getWeekKey } from "../common/week-key";
import { PrismaService } from "../prisma/prisma.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";

export interface ImportRow {
  text?: unknown;
  choices?: unknown;
  correctIndex?: unknown;
  category?: unknown;
  difficulty?: unknown;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard summary counters. */
  async stats() {
    const weekKey = getWeekKey();
    const [users, admins, questions, activeQuestions, rounds, roundsThisWeek, scoreEvents, pendingAwards] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isAdmin: true } }),
        this.prisma.question.count(),
        this.prisma.question.count({ where: { isActive: true } }),
        this.prisma.round.count(),
        this.prisma.round.count({ where: { status: RoundStatus.FINISHED, finishedAt: { not: null } } }),
        this.prisma.scoreEvent.count(),
        this.prisma.prizeAward.count({ where: { status: PrizeAwardStatus.PENDING } }),
      ]);
    return {
      weekKey,
      users,
      admins,
      questions,
      activeQuestions,
      rounds,
      finishedRounds: roundsThisWeek,
      scoreEvents,
      pendingAwards,
    };
  }

  listQuestions(skip = 0, take = 50) {
    return this.prisma.question.findMany({ orderBy: { createdAt: "desc" }, skip, take });
  }

  /**
   * Bulk-import questions (rows already normalized by the client from CSV/Excel).
   * Validates each row; inserts the valid ones and returns per-row errors for the rest.
   */
  async importQuestions(
    rows: ImportRow[],
  ): Promise<{ created: number; failed: number; errors: Array<{ row: number; message: string }> }> {
    const errors: Array<{ row: number; message: string }> = [];
    const valid: Array<{
      text: string;
      choices: string[];
      correctIndex: number;
      difficulty: number;
      category?: string;
    }> = [];

    rows.forEach((r, i) => {
      const rowNum = i + 1;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      if (!text) return void errors.push({ row: rowNum, message: "متن سوال خالی است" });
      if (text.length > 500)
        return void errors.push({ row: rowNum, message: "متن سوال بیش از حد بلند است (حداکثر ۵۰۰ کاراکتر)" });

      const choices = Array.isArray(r.choices) ? r.choices.map((c) => String(c ?? "").trim()) : [];
      if (choices.length !== 4 || choices.some((c) => !c)) {
        return void errors.push({ row: rowNum, message: "باید دقیقا ۴ گزینه غیرخالی باشد" });
      }

      const ci = Number(r.correctIndex);
      if (!Number.isInteger(ci) || ci < 0 || ci > 3) {
        return void errors.push({ row: rowNum, message: "پاسخ درست باید یکی از A تا D باشد" });
      }

      let difficulty = 1;
      if (r.difficulty !== undefined && r.difficulty !== null && `${r.difficulty}` !== "") {
        const d = Number(r.difficulty);
        if (!Number.isInteger(d) || d < 1 || d > 3) {
          return void errors.push({ row: rowNum, message: "سطح دشواری باید بین ۱ تا ۳ باشد" });
        }
        difficulty = d;
      }

      const category = typeof r.category === "string" && r.category.trim() ? r.category.trim() : undefined;
      valid.push({ text, choices, correctIndex: ci, difficulty, category });
    });

    if (valid.length > 0) {
      await this.prisma.question.createMany({
        data: valid.map((v) => ({
          text: v.text,
          choices: v.choices,
          correctIndex: v.correctIndex,
          difficulty: v.difficulty,
          category: v.category,
        })),
      });
    }
    return { created: valid.length, failed: errors.length, errors };
  }

  createQuestion(dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        text: dto.text,
        choices: dto.choices,
        correctIndex: dto.correctIndex,
        difficulty: dto.difficulty ?? 1,
        category: dto.category,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    await this.ensureQuestion(id);
    return this.prisma.question.update({
      where: { id },
      data: {
        ...dto,
        choices: dto.choices as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Soft delete — deactivate so historical RoundQuestion rows keep their FK. */
  async deactivateQuestion(id: string) {
    await this.ensureQuestion(id);
    return this.prisma.question.update({ where: { id }, data: { isActive: false } });
  }

  listPrizeAwards(weekKey?: string) {
    return this.prisma.prizeAward.findMany({
      where: weekKey ? { weekKey } : undefined,
      orderBy: { awardedAt: "desc" },
      include: {
        prize: true,
        user: { select: { id: true, phone: true, displayName: true } },
      },
    });
  }

  async updateAwardStatus(id: string, status: PrizeAwardStatus) {
    const existing = await this.prisma.prizeAward.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("جایزه پیدا نشد");
    return this.prisma.prizeAward.update({ where: { id }, data: { status } });
  }

  private async ensureQuestion(id: string): Promise<void> {
    const q = await this.prisma.question.findUnique({ where: { id }, select: { id: true } });
    if (!q) throw new NotFoundException("سوال پیدا نشد");
  }
}
