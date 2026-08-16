import { IsString } from "class-validator";

export class NextQuestionsDto {
  @IsString()
  roundId!: string;
}
