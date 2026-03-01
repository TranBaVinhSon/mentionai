import { gengarApi } from "@/services/api";
import { useMutation } from "@tanstack/react-query";

/**
 * Hook to generate suggested questions using AI
 */
export const useGenerateSuggestedQuestions = () => {
  return useMutation({
    mutationFn: ({
      description,
      instruction,
      numberOfQuestions,
    }: {
      description: string;
      instruction: string;
      numberOfQuestions: number;
    }) =>
      gengarApi.generateSuggestedQuestions(
        description,
        instruction,
        numberOfQuestions
      ),
  });
};
