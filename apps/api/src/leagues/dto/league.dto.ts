import { IsBoolean, IsIn, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateLeagueDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  isOverall?: boolean;

  // Base rounds each player may play in this league (default 3).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  roundAllowance?: number;

  // The overall campaign this (non-overall) league belongs to, for grouping in the UI.
  @IsOptional()
  @IsString()
  parentLeagueId?: string;
}

export class UpdateLeagueDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isOverall?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  roundAllowance?: number;

  @IsOptional()
  @IsString()
  parentLeagueId?: string;
}

export class CollectRewardDto {
  // Required only for rewards that offer an optional prize.
  @IsOptional()
  @IsIn(["POINTS", "DISCOUNT"])
  choice?: "POINTS" | "DISCOUNT";
}
