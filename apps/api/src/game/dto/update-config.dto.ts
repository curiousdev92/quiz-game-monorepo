import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, Max, Min, ValidateNested } from "class-validator";

export class DifficultyMixEntryDto {
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty!: number;

  @IsInt()
  @Min(0)
  @Max(12)
  count!: number;
}

export class PointsPerDifficultyEntryDto {
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty!: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  points!: number;
}

/** Admin update of the game settings. All fields optional (patch). */
export class UpdateGameConfigDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(3600)
  gameDurationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  roundBonus?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  referralBonus?: number;

  // How each 12-question page is composed across difficulty 1-3 — counts must sum to 12.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => DifficultyMixEntryDto)
  difficultyMix?: DifficultyMixEntryDto[];

  // Points awarded per correct answer, per question difficulty tier (1-3).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PointsPerDifficultyEntryDto)
  pointsPerDifficulty?: PointsPerDifficultyEntryDto[];
}
