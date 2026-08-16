import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";

import { AdminGuard } from "../auth/admin.guard";
import { UpdateGameConfigDto } from "./dto/update-config.dto";
import { GameConfigService } from "./game-config.service";

/** Admin surface for the game settings (the configurable game timer, etc.). */
@Controller("admin/game/config")
@UseGuards(AdminGuard)
export class AdminGameController {
  constructor(private readonly config: GameConfigService) {}

  @Get()
  get() {
    return this.config.get();
  }

  @Put()
  update(@Body() dto: UpdateGameConfigDto) {
    return this.config.update(dto);
  }
}
