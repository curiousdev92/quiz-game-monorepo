import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

export class CloseWeekDto {
  // Defaults to the previous ISO week if omitted.
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-W\d{2}$/, { message: "قالب weekKey باید مانند 2026-W29 باشد" })
  weekKey?: string;

  // true → run inline and return the result; false/omitted → enqueue on BullMQ.
  @IsOptional()
  @IsBoolean()
  sync?: boolean;
}
