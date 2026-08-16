import { QuestType, QuestVerify } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateQuestDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(QuestType)
  type!: QuestType;

  @IsInt()
  @Min(0)
  @Max(100000)
  rewardScore!: number;

  // Extra playable rounds granted on collect (for the active league).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  rewardRounds?: number;

  // CHALLENGE only.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  targetScore?: number;

  // ACTION only.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  actionUrl?: string;

  // ACTION only: auto-verify method + threshold.
  @IsOptional()
  @IsEnum(QuestVerify)
  verify?: QuestVerify;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  verifyTarget?: number;

  // ACTION + honor-system (verify=NONE): seconds to wait after opening the link before Collect unlocks.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  minDwellSeconds?: number;

  // Shop-access ACTION: set all three to grant an external game SKU on click (e.g. little_guardians/map/full_game).
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
