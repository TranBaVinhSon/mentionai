"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { SuggestedQuestionsEditor } from "@/components/suggested-questions-editor";
import { useGenerateSuggestedQuestions } from "@/hooks/use-generate-suggested-questions";
import { toast } from "@/hooks/use-toast";

interface SuggestedQuestionsSectionProps {
  form: UseFormReturn<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestedQuestionsSection({
  form,
  open,
  onOpenChange,
}: SuggestedQuestionsSectionProps) {
  const { mutateAsync: generateQuestions, isPending: isGeneratingQuestions } =
    useGenerateSuggestedQuestions();

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CollapsibleTrigger className="flex-1 flex items-start justify-between hover:opacity-80 transition-opacity group">
              <div className="flex flex-col items-start gap-1 text-left">
                <CardTitle className="text-base">Suggested Questions</CardTitle>
                <CardDescription className="text-base">
                  Questions that users can ask your digital clone
                </CardDescription>
              </div>
              <ChevronDown className="size-5 mt-0.5 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const description = form.getValues("description");
                const instruction = form.getValues("instruction");

                if (!description || !instruction) {
                  toast({
                    title: "Missing Information",
                    description:
                      "Please fill in the description and instruction fields first",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const currentQuestions = form.watch(
                    "suggestedQuestions.questions"
                  );
                  const numberOfQuestions = currentQuestions.length || 6;

                  const result = await generateQuestions({
                    description,
                    instruction,
                    numberOfQuestions,
                  });

                  if (result?.questions && result.questions.length > 0) {
                    form.setValue(
                      "suggestedQuestions.questions",
                      result.questions
                    );
                    toast({
                      title: "Questions Generated",
                      description: `Generated ${result.questions.length} questions successfully`,
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Generation Failed",
                    description:
                      "Failed to generate questions. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isGeneratingQuestions}
              className="flex-shrink-0"
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate with AI
                </>
              )}
            </Button>
            <SuggestedQuestionsEditor
              questions={form.watch("suggestedQuestions.questions") || []}
              onChange={(questions) => {
                form.setValue("suggestedQuestions.questions", questions);
              }}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
