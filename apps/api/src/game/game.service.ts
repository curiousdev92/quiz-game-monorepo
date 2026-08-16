import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Question, RoundStatus, ScoreReason } from "@prisma/client";

import { getWeekKey } from "../common/week-key";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { LeaguesService } from "../leagues/leagues.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReferralsService } from "../referrals/referrals.service";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { GameConfigService, PAGE_SIZE } from "./game-config.service";

/** In-place Fisher-Yates shuffle so a page's difficulty tiers aren't served in predictable blocks. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Small grace so an answer sent right on the buzzer isn't rejected by network lag.
const DEADLINE_GRACE_MS = 1500;

export interface QuestionView {
  roundQuestionId: string;
  questionId: string;
  text: string;
  choices: string[];
  category: string | null;
}

export interface StartedRound {
  roundId: string;
  startedAt: string;
  endsAt: string;
  durationSeconds: number;
  questions: QuestionView[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  awardedPoints: number;
  roundScore: number;
}

export interface RoundSummary {
  roundId: string;
  status: RoundStatus;
  correctCount: number;
  totalCount: number;
  roundScore: number;
}

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GameConfigService,
    private readonly leaderboard: LeaderboardService,
    private readonly referrals: ReferralsService,
    private readonly leagues: LeaguesService,
  ) {}

  /** The caller's remaining round budget in the currently-active league. */
  async roundBudget(userId: string) {
    const b = await this.leagues.roundBudget(userId);
    return {
      league: b.league ? { id: b.league.id, title: b.league.title, endsAt: b.league.endsAt.toISOString() } : null,
      allowance: b.allowance,
      used: b.used,
      remaining: b.remaining,
    };
  }

  /** Start a fresh round: abandon any stale one, pick random questions, hide correct answers. */
  async startRound(userId: string): Promise<StartedRound> {
    const cfg = await this.config.get();

    // Enforce the per-league round cap before anything else. Admins preview freely (never capped).
    const player = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isAdmin: true },
    });
    const budget = await this.leagues.roundBudget(userId);
    if (!player.isAdmin) {
      if (!budget.league) {
        throw new BadRequestException("در حال حاضر لیگ فعالی وجود ندارد و بازی بسته است");
      }
      if (budget.remaining <= 0) {
        throw new BadRequestException("دور دیگری در این لیگ برای شما باقی نمانده است");
      }
    }
    const leagueId = budget.league?.id ?? null;

    // Roll any leftover collectible reward points from previous (finished) leagues into
    // whichever league is active now, so they don't sit unclaimed once a new week starts.
    if (!player.isAdmin) {
      await this.leagues.autoCollectPendingRewards(userId);
    }

    // A user only plays one round at a time — retire any leftover in-progress rounds.
    await this.prisma.round.updateMany({
      where: { userId, status: RoundStatus.IN_PROGRESS },
      data: { status: RoundStatus.ABANDONED, finishedAt: new Date() },
    });

    const ordered = await this.pickQuestionPage([]);
    if (ordered.length === 0) {
      throw new BadRequestException("سوال فعالی موجود نیست");
    }

    const round = await this.prisma.round.create({
      data: {
        userId,
        leagueId,
        status: RoundStatus.IN_PROGRESS,
        questions: {
          create: ordered.map((q) => ({ questionId: q.id })),
        },
      },
      include: { questions: true },
    });

    // (Tiered-league enrollment removed — "leagues" are now daily leaderboard periods.)

    // Map each RoundQuestion back to its Question for the client payload.
    const rqByQuestion = new Map(round.questions.map((rq) => [rq.questionId, rq]));
    const startedAt = round.startedAt;
    const endsAt = new Date(startedAt.getTime() + cfg.gameDurationSeconds * 1000);

    return {
      roundId: round.id,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationSeconds: cfg.gameDurationSeconds,
      questions: ordered.map((q) => ({
        roundQuestionId: rqByQuestion.get(q.id)!.id,
        questionId: q.id,
        text: q.text,
        choices: q.choices as string[],
        category: q.category,
      })),
    };
  }

  /**
   * The next page of PAGE_SIZE (12) questions for a round already in progress — the client
   * requests this once the player nears the end of their current page, so the round feels
   * like one continuous stream of questions until the timer (not the question count) ends it.
   */
  async nextQuestions(userId: string, roundId: string): Promise<{ questions: QuestionView[] }> {
    const round = await this.prisma.round.findUnique({ where: { id: roundId }, include: { questions: true } });
    if (!round || round.userId !== userId) {
      throw new NotFoundException("دور پیدا نشد");
    }
    if (round.status !== RoundStatus.IN_PROGRESS) {
      throw new BadRequestException("این دور در جریان نیست");
    }

    const cfg = await this.config.get();
    const deadline = round.startedAt.getTime() + cfg.gameDurationSeconds * 1000 + DEADLINE_GRACE_MS;
    if (Date.now() > deadline) {
      await this.finalize(round.id);
      throw new BadRequestException("زمان دور به پایان رسیده است");
    }

    const excludeIds = round.questions.map((rq) => rq.questionId);
    const page = await this.pickQuestionPage(excludeIds);
    if (page.length === 0) {
      return { questions: [] }; // question bank exhausted — client just stops prefetching
    }

    const created = await this.prisma.roundQuestion.createManyAndReturn({
      data: page.map((q) => ({ roundId: round.id, questionId: q.id })),
    });
    const rqByQuestion = new Map(created.map((rq) => [rq.questionId, rq]));

    return {
      questions: page.map((q) => ({
        roundQuestionId: rqByQuestion.get(q.id)!.id,
        questionId: q.id,
        text: q.text,
        choices: q.choices as string[],
        category: q.category,
      })),
    };
  }

  /**
   * Pick one PAGE_SIZE (12) question page mixing difficulties per the admin-configured
   * `difficultyMix`, excluding questions already served in this round where possible.
   * Falls back to backfilling from any difficulty if a tier's pool runs dry.
   */
  private async pickQuestionPage(excludeIds: string[]): Promise<Question[]> {
    const mix = await this.config.difficultyMix();
    const usedIds = new Set(excludeIds);
    const pickedIds: string[] = [];

    for (const { difficulty, count } of mix) {
      if (count <= 0) continue;
      const ids = await this.pickIdsForDifficulty(difficulty, count, [...usedIds]);
      ids.forEach((id) => usedIds.add(id));
      pickedIds.push(...ids);
    }

    const shortfall = PAGE_SIZE - pickedIds.length;
    if (shortfall > 0) {
      const ids = await this.pickIdsForDifficulty(null, shortfall, [...usedIds]);
      ids.forEach((id) => usedIds.add(id));
      pickedIds.push(...ids);
    }

    if (pickedIds.length === 0) return [];
    const questions = await this.prisma.question.findMany({ where: { id: { in: pickedIds } } });
    const byId = new Map(questions.map((q) => [q.id, q]));
    return shuffle(pickedIds.map((id) => byId.get(id)!).filter(Boolean));
  }

  /**
   * Pick `count` random active question ids of a difficulty, excluding `excludeIds`.
   * Instead of `ORDER BY RANDOM()` (which sorts the whole matching set), we pick a random
   * pivot and range-scan the indexed `rand` column from there, wrapping to the bottom if the
   * top slice runs short. This reads ~`count` rows via the index — O(count), not O(N log N).
   */
  private async pickIdsForDifficulty(
    difficulty: number | null,
    count: number,
    excludeIds: string[],
  ): Promise<string[]> {
    if (count <= 0) return [];
    const difficultyClause = difficulty === null ? Prisma.empty : Prisma.sql`AND difficulty = ${difficulty}`;
    const pivot = Math.random();

    const scan = async (limit: number, extraExclude: string[], wrap: boolean): Promise<string[]> => {
      const exclude = [...excludeIds, ...extraExclude];
      const excludeClause = exclude.length > 0 ? Prisma.sql`AND id NOT IN (${Prisma.join(exclude)})` : Prisma.empty;
      const bound = wrap ? Prisma.sql`AND "rand" < ${pivot}` : Prisma.sql`AND "rand" >= ${pivot}`;
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "Question" WHERE "isActive" = true ${difficultyClause} ${excludeClause} ${bound} ORDER BY "rand" ASC LIMIT ${limit}`,
      );
      return rows.map((r) => r.id);
    };

    const top = await scan(count, [], false);
    if (top.length >= count) return top;
    // Top slice was short (pivot landed high) — wrap around from the bottom for the rest.
    const wrapped = await scan(count - top.length, top, true);
    return [...top, ...wrapped];
  }

  /** Record one answer, score it, and reveal the correct index for the green/red UX. */
  async submitAnswer(userId: string, dto: SubmitAnswerDto): Promise<AnswerResult> {
    const round = await this.prisma.round.findUnique({
      where: { id: dto.roundId },
      include: { user: { select: { isAdmin: true } } },
    });
    if (!round || round.userId !== userId) {
      throw new NotFoundException("دور پیدا نشد");
    }
    if (round.status !== RoundStatus.IN_PROGRESS) {
      throw new BadRequestException("این دور در جریان نیست");
    }

    const cfg = await this.config.get();
    const deadline = round.startedAt.getTime() + cfg.gameDurationSeconds * 1000 + DEADLINE_GRACE_MS;
    if (Date.now() > deadline) {
      // Time is up — finalize and reject late answers.
      await this.finalize(round.id);
      throw new BadRequestException("زمان دور به پایان رسیده است");
    }

    const rq = await this.prisma.roundQuestion.findUnique({
      where: { id: dto.roundQuestionId },
      include: { question: true },
    });
    if (!rq || rq.roundId !== round.id) {
      throw new NotFoundException("سوال در این دور پیدا نشد");
    }
    if (rq.answeredIndex !== null) {
      throw new BadRequestException("به این سوال قبلا پاسخ داده‌اید");
    }

    const isCorrect = dto.answeredIndex === rq.question.correctIndex;
    const weekKey = getWeekKey();
    // Points scale with the question's own difficulty tier (admin-configured per tier).
    const tierPoints = await this.config.pointsForDifficulty(rq.question.difficulty);
    // Admins can answer for previewing, but their answers never score.
    const awardPoints = !round.user.isAdmin && isCorrect && tierPoints > 0 ? tierPoints : 0;

    const newRoundScore = await this.prisma.$transaction(async (tx) => {
      await tx.roundQuestion.update({
        where: { id: rq.id },
        data: { answeredIndex: dto.answeredIndex, isCorrect, answeredAt: new Date() },
      });
      if (awardPoints > 0) {
        await tx.scoreEvent.create({
          data: {
            userId,
            roundId: round.id,
            points: awardPoints,
            reason: ScoreReason.CORRECT_ANSWER,
            weekKey,
          },
        });
        // Keep the denormalized round total in sync in the same transaction, and read
        // back the new value — avoids re-aggregating ScoreEvents after every answer.
        const updated = await tx.round.update({
          where: { id: round.id },
          data: { score: { increment: awardPoints } },
          select: { score: true },
        });
        return updated.score;
      }
      return round.score; // wrong answer / admin — total unchanged
    });

    // Ledger is committed; now bump the rebuildable leaderboard cache (best-effort).
    if (awardPoints > 0) {
      await this.leaderboard.addPoints(userId, awardPoints, weekKey);
    }

    return {
      isCorrect,
      correctIndex: rq.question.correctIndex,
      awardedPoints: isCorrect ? tierPoints : 0,
      roundScore: newRoundScore,
    };
  }

  async finishRound(userId: string, roundId: string): Promise<RoundSummary> {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.userId !== userId) {
      throw new NotFoundException("دور پیدا نشد");
    }
    if (round.status === RoundStatus.IN_PROGRESS) {
      await this.finalize(roundId);
      // First-completion referral credit (no-op unless this is their 1st finished round).
      await this.referrals.onRoundFinished(userId);
    }
    return this.summary(roundId);
  }

  /** Mark a round FINISHED and award the one-time round bonus (if configured). */
  private async finalize(roundId: string): Promise<void> {
    const cfg = await this.config.get();
    const weekKey = getWeekKey();

    // The transaction is idempotent (only the first caller flips IN_PROGRESS -> FINISHED),
    // and returns the awarded bonus so the cache is bumped exactly once.
    const awarded = await this.prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
        include: { user: { select: { isAdmin: true } } },
      });
      if (!round || round.status !== RoundStatus.IN_PROGRESS) return null;
      await tx.round.update({
        where: { id: roundId },
        data: { status: RoundStatus.FINISHED, finishedAt: new Date() },
      });
      if (cfg.roundBonus > 0 && !round.user.isAdmin) {
        await tx.scoreEvent.create({
          data: {
            userId: round.userId,
            roundId,
            points: cfg.roundBonus,
            reason: ScoreReason.ROUND_BONUS,
            weekKey,
          },
        });
        await tx.round.update({ where: { id: roundId }, data: { score: { increment: cfg.roundBonus } } });
        return { userId: round.userId, points: cfg.roundBonus };
      }
      return null;
    });

    if (awarded) {
      await this.leaderboard.addPoints(awarded.userId, awarded.points, weekKey);
    }
  }

  private async summary(roundId: string): Promise<RoundSummary> {
    const round = await this.prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      include: { questions: true },
    });
    return {
      roundId,
      status: round.status,
      correctCount: round.questions.filter((q) => q.isCorrect === true).length,
      totalCount: round.questions.length,
      roundScore: round.score, // denormalized running total (kept in sync per award)
    };
  }
}
