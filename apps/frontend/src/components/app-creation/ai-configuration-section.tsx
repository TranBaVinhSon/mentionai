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
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { generateInstructionForApp } from "@/app/actions/generate-text";

interface AiConfigurationSectionProps {
  form: UseFormReturn<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiConfigurationSection({
  form,
  open,
  onOpenChange,
}: AiConfigurationSectionProps) {
  const [isGeneratingInstruction, setIsGeneratingInstruction] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity group">
            <div className="flex flex-col items-start gap-1 text-left">
              <CardTitle className="text-base">AI Configuration</CardTitle>
              <CardDescription className="text-base">
                Configure how your digital clone responds to users
              </CardDescription>
            </div>
            <ChevronDown className="size-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* System Instruction */}
            <FormField
              control={form.control}
              name="instruction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base after:content-['*'] after:ml-0.5 after:text-destructive">
                    System Instructions
                  </FormLabel>
                  <FormDescription className="text-base">
                    Define your digital twin's personality and behavior
                  </FormDescription>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder={`You are representing [Your Name], a [Your Profession]. Be helpful, friendly, and authentic in your responses. Share insights about [Your Expertise] and help users understand your perspective...`}
                        className="min-h-[150px] pr-12 text-base"
                        {...field}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 size-8"
                        type="button"
                        disabled={isGeneratingInstruction}
                        onClick={async () => {
                          const name = form.getValues("name");
                          if (!name) {
                            form.setError("name", {
                              message: "Please enter a name first",
                            });
                            return;
                          }
                          setIsGeneratingInstruction(true);
                          try {
                            const instruction = await generateInstructionForApp(
                              name
                            );
                            field.onChange(instruction);
                          } catch (error) {
                            console.error(
                              "Failed to generate instruction:",
                              error
                            );
                          } finally {
                            setIsGeneratingInstruction(false);
                          }
                        }}
                      >
                        {isGeneratingInstruction ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Wand2 className="size-4" />
                        )}
                        <span className="sr-only">Auto fill</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
