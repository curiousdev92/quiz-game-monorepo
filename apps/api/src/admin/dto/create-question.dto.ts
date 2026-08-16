import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateQuestionDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  // 4-option game: exactly four choices.
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  choices!: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  difficulty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
