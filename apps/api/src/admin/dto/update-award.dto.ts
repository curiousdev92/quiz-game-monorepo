import { PrizeAwardStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateAwardDto {
  @IsEnum(PrizeAwardStatus)
  status!: PrizeAwardStatus;
}
