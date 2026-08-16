import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(["overall", "weekly"])
  scope: "overall" | "weekly" = "overall";

  // Daily period like "2026-07-19"; used when scope=weekly (a day), defaults to today.
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "قالب weekKey باید مانند 2026-07-19 باشد" })
  weekKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}
