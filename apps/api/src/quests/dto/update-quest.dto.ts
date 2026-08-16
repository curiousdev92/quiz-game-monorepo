import { QuestType, QuestVerify } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/** All fields optional for PATCH. */
export class UpdateQuestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(QuestType)
  type?: QuestType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  rewardScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  rewardRounds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  targetScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionUrl?: string;

  @IsOptional()
  @IsEnum(QuestVerify)
  verify?: QuestVerify;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  verifyTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  minDwellSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopGameCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopSkuKind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopSkuId?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
