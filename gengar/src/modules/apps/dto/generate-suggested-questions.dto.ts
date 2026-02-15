import { IsNotEmpty, IsString, IsInt, Min, Max } from "class-validator";

export class GenerateSuggestedQuestionsDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  instruction: string;

  @IsInt()
  @Min(1)
  @Max(6)
  numberOfQuestions?: number;
}
