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

/** Partial update of a question. */
export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  choices?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex?: number;

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
