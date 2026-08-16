import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FinishRoundDto } from "./dto/finish-round.dto";
import { NextQuestionsDto } from "./dto/next-questions.dto";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { GameConfigService } from "./game-config.service";
import { GameService } from "./game.service";

@Controller("game")
export class GameController {
  constructor(
    private readonly game: GameService,
    private readonly config: GameConfigService,
  ) {}

  /** Public: timing the intro screen needs before a round starts. */
  @Get("config")
  async publicConfig() {
    const cfg = await this.config.get();
    return {
      gameDurationSeconds: cfg.gameDurationSeconds,
    };
  }

  /** Auth: the caller's remaining rounds in the active league (drives the Play button). */
  @Get("rounds")
  @UseGuards(JwtAuthGuard)
  rounds(@CurrentUser() user: JwtPayload) {
    return this.game.roundBudget(user.sub);
  }

  /** Start a round (after the 3-2-1 countdown on the client). */
  @Post("start")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtPayload) {
    return this.game.startRound(user.sub);
  }

  /** Fetch the next page of 12 questions for a round already in progress. */
  @Post("questions/next")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  nextQuestions(@CurrentUser() user: JwtPayload, @Body() dto: NextQuestionsDto) {
    return this.game.nextQuestions(user.sub, dto.roundId);
  }

  /** Submit one answer; response reveals correctIndex for the green/red feedback. */
  @Post("answer")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  answer(@CurrentUser() user: JwtPayload, @Body() dto: SubmitAnswerDto) {
    return this.game.submitAnswer(user.sub, dto);
  }

  /** Finish the round and get the summary. */
  @Post("finish")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  finish(@CurrentUser() user: JwtPayload, @Body() dto: FinishRoundDto) {
    return this.game.finishRound(user.sub, dto.roundId);
  }
}
