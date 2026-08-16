import { IsString } from "class-validator";

export class FinishRoundDto {
  @IsString()
  roundId!: string;
}
