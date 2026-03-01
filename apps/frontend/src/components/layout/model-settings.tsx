"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useModels } from "@/hooks/use-models";
import ModelLogo from "../shared/model-logo";
import { useUser } from "@/hooks/use-user";
import { useMutation } from "@tanstack/react-query";
import { gengarApi, GengarSubscriptionPlan } from "@/services/api";
import { getQueryClient } from "../query-client/get-query-client";
import { useSession } from "next-auth/react";
import { ChevronsUpDown as UnfoldMoreIcon } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_MODELS } from "@/utils/constants";
import { Brain, Globe, Image as ImageIcon } from "lucide-react";
import { MyTooltip } from "@/components/ui/tooltip";

export function ModelSettings() {
  const queryClient = getQueryClient();

  const { data: user, isLoading, refetch: refetchUser } = useUser();
  const { toast } = useToast();
  const session = useSession();
  const [textOpen, setTextOpen] = React.useState(false);
  const models = useModels();

  const textModels = React.useMemo(() => {
    return (models || []).filter(
      (model) =>
        model.modelType !== "image" &&
        model.modelType !== "video" &&
        model.id !== 1 && // Exclude gpt-4o-mini
        model.id !== 48 // Exclude claude-4-sonnet
    );
  }, [models]);

  const textModel = textModels.find(
    (model) => model.id === user?.defaultTextModelId
  );

  const { mutateAsync: updateDefaultModels, mutate } = useMutation<
    void,
    Error,
    {
      textModelId?: number;
      imageModelId?: number;
    }
  >({
    mutationFn: ({
      textModelId,
      imageModelId,
    }: {
      textModelId?: number;
      imageModelId?: number;
    }) => {
      return gengarApi.updateDefaultModels(
        user?.userId as number,
        textModelId,
        imageModelId
      );
    },
    onMutate: (variables) => {
      // Cancel current queries for the todos list

      // Create optimistic todo

      // Add optimistic todo to todos list
      queryClient.setQueryData(["profile", "authenticated"], (old: any) => ({
        ...old,
        defaultTextModelId: variables.textModelId,
      }));
    },
    onSuccess: async () => {
      // queryClient.invalidateQueries(["profile", "authenticated"] as any);
      const { data } = await refetchUser();
      const newTextModel = textModels.find(
        (model) => model.id === data?.defaultTextModelId
      );
      toast({
        title: "Updated Successfully",
        description: `Default model has been updated to ${newTextModel?.displayName}`,
      });
    },
    onError: () => {
      // queryClient.invalidateQueries(["profile", "authenticated"] as any);
      toast({
        title: "Error",
        description: "Failed to update default model",
        variant: "destructive",
      });
    },
  });

  // useEffect(() => {
  //   if (!user || session.status === "unauthenticated") return;
  // }, [user, session.status]);

  if (session.status === "unauthenticated") return null;

  if (isLoading) {
    return <div className="h-9 w-[164px] animate-pulse bg-muted rounded-md" />;
  }

  return (
    <div className="flex items-center">
      <Popover open={textOpen} onOpenChange={setTextOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={textOpen}
            className="min-w-[100px] md:min-w-[164px] h-8 md:h-10 px-2 md:px-3 [&_svg]:size-4 md:[&_svg]:size-5 dark:bg-muted dark:text-foreground"
          >
            {textModel ? (
              <div className="flex flex-1 items-center space-x-1">
                <ModelLogo size={16} model={textModel.name} />
                <div className="text-sm md:text-sm truncate flex-1">
                  <span className="hidden sm:inline">
                    {textModel.displayName}
                  </span>
                  <span className="sm:hidden">
                    {textModel.displayName.substring(0, 8)}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm md:text-sm">Select...</span>
            )}
            <UnfoldMoreIcon className="h-3 w-3 md:h-4 md:w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] md:w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Search text model..." />
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandGroup>
                {(textModels || []).map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.name}
                    onSelect={(currentValue) => {
                      if (
                        model.isProModel &&
                        user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                      ) {
                        return;
                      }
                      const updatedModel = textModels.find(
                        (m) => m.name === currentValue
                      );
                      updateDefaultModels({
                        textModelId: updatedModel?.id,
                      });
                      setTextOpen(false);
                    }}
                    className={cn(
                      model.isProModel &&
                        user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center flex-1 mr-2 overflow-hidden">
                      <ModelLogo size={16} model={model.name} />
                      <div className="text-sm md:text-sm mx-2 text-foreground truncate">
                        {model.displayName}
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        {model.isReasoning && (
                          <MyTooltip content="Supports reasoning">
                            <Brain
                              size={14}
                              className="text-foreground/60 flex-shrink-0"
                            />
                          </MyTooltip>
                        )}
                        {model.supportsWebSearch && (
                          <MyTooltip content="Supports web search">
                            <Globe
                              size={14}
                              className="text-foreground/60 flex-shrink-0"
                            />
                          </MyTooltip>
                        )}
                        {model.supportsImageInput && (
                          <MyTooltip content="Supports image input">
                            <ImageIcon
                              size={14}
                              className="text-foreground/60 flex-shrink-0"
                            />
                          </MyTooltip>
                        )}
                      </div>
                    </div>
                    {model.isProModel ? (
                      <span className="bg-orange-500 text-orange-100 rounded-full flex items-center justify-center font-semibold text-xs md:text-[10px] px-2 h-5 md:h-4">
                        Plus
                      </span>
                    ) : (
                      <span className="bg-blue-500 text-blue-100 rounded-full flex items-center justify-center font-semibold text-xs md:text-[10px] px-2 h-5 md:h-4">
                        Free
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
