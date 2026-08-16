import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AdminGuard } from "../auth/admin.guard";
import { CreateQuestDto } from "./dto/create-quest.dto";
import { UpdateQuestDto } from "./dto/update-quest.dto";
import { QuestsService } from "./quests.service";

@Controller("admin/quests")
@UseGuards(AdminGuard)
export class AdminQuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get()
  list() {
    return this.quests.listAll();
  }

  @Post()
  create(@Body() dto: CreateQuestDto) {
    return this.quests.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateQuestDto) {
    return this.quests.update(id, dto);
  }

  @Delete(":id")
  deactivate(@Param("id") id: string) {
    return this.quests.deactivate(id);
  }
}
