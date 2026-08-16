import { IsInt, IsString, Max, Min } from "class-validator";

export class SubmitAnswerDto {
  @IsString()
  roundId!: string;

  @IsString()
  roundQuestionId!: string;

  // 4-option game: index 0..3.
  @IsInt()
  @Min(0)
  @Max(3)
  answeredIndex!: number;
}
