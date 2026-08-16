import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AdminGuard } from "../auth/admin.guard";
import { CreateLeagueDto, UpdateLeagueDto } from "./dto/league.dto";
import { LeaguesService, type ImportDiscountCodeRow } from "./leagues.service";

@Controller("admin/leagues")
@UseGuards(AdminGuard)
export class AdminLeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Get()
  list() {
    return this.leagues.listAll();
  }

  @Post()
  create(@Body() dto: CreateLeagueDto) {
    return this.leagues.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLeagueDto) {
    return this.leagues.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.leagues.remove(id);
  }

  /** Manually freeze a league now (also happens automatically when its window ends). */
  @Post(":id/freeze")
  @HttpCode(HttpStatus.OK)
  freeze(@Param("id") id: string) {
    return this.leagues.freeze(id);
  }

  /** Rewards for a league (fulfillment view — who won what). */
  @Get(":id/rewards")
  rewards(@Param("id") id: string) {
    return this.leagues.leagueRewards(id);
  }
}

@Controller("admin/discount-codes")
@UseGuards(AdminGuard)
export class AdminDiscountCodesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Get()
  stats() {
    return this.leagues.discountStats();
  }

  /** Bulk import (rows normalized client-side from Excel/CSV). */
  @Post("import")
  @HttpCode(HttpStatus.OK)
  import(@Body() body: { codes?: ImportDiscountCodeRow[] }) {
    return this.leagues.importDiscountCodes(Array.isArray(body?.codes) ? body.codes : []);
  }
}
