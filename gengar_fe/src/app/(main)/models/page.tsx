// https://stackoverflow.com/a/77625900
"use client";
import * as React from "react";

import ModelLogo from "@/components/shared/model-logo";
import { useModels } from "@/hooks/use-models";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";
import { PlusIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Brain, Globe, Image as ImageIcon } from "lucide-react";
import { MyTooltip } from "@/components/ui/tooltip";
import { GengarSubscriptionPlan } from "@/services/api";
import { useUser } from "@/hooks/use-user";

export default function ModelsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: user } = useUser();

  const models = useModels();

  const textModels = React.useMemo(() => {
    return (models || []).filter(
      (model) => model.modelType !== "image" && model.modelType !== "video"
    );
  }, [models]);

  const imageModels = React.useMemo(() => {
    return (models || []).filter((model) => model.modelType === "image");
  }, [models]);

  const otherModels = React.useMemo(() => {
    return (models || []).filter(
      (model) => model.modelType !== "image" && model.modelType !== "text"
    );
  }, [models]);

  // Combine official and user apps for easier filtering

  return (
    <div className="mx-auto px-2 sm:px-4 md:px-8 w-full mt-4 sm:mt-6 flex flex-col gap-8 sm:gap-12 mb-8">
      {/* Chat Models */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
          Chat Models
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
          {textModels?.map((model, idx) => (
            <div
              key={idx}
              className="group flex w-full cursor-pointer items-center gap-3 sm:gap-4 rounded-md"
            >
              <div className="flex grow items-center justify-between border-b border-border group-last:border-none">
                <div className="flex flex-col gap-1 py-3 sm:py-4 w-full h-[120px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ModelLogo
                        model={model.name}
                        size={32}
                        // className="sm:size-24"
                      />

                      <h2 className="text-xs sm:text-sm font-medium">
                        {model.displayName}
                      </h2>

                      {/* NEW: Capability Icons */}
                      <div className="flex items-center gap-1 ml-1">
                        {model.isReasoning && (
                          <MyTooltip content="Supports reasoning">
                            <Brain size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsWebSearch && (
                          <MyTooltip content="Supports web search">
                            <Globe size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsImageInput && (
                          <MyTooltip content="Supports image input">
                            <ImageIcon
                              size={12}
                              className="text-foreground/60"
                            />
                          </MyTooltip>
                        )}
                      </div>

                      {model.isProModel && (
                        <span className="bg-orange-500 text-orange-100 rounded-full flex items-center justify-center font-semibold text-[8px] sm:text-[10px] px-1.5 sm:px-2 h-3 sm:h-4 ml-auto">
                          Plus
                        </span>
                      )}
                    </div>

                    <button
                      className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-[#007AFF]"
                      onClick={() => {
                        if (
                          status === "unauthenticated" &&
                          model.isLoginRequired
                        ) {
                          setSignInDialog(true);
                        } else if (
                          model.isProModel &&
                          user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                        ) {
                          router.push("/pricing");
                        } else {
                          router.push(`/?model=${model.name}`);
                        }
                      }}
                    >
                      Get
                    </button>
                  </div>

                  <p className="text-sm text-foreground/60 line-clamp-2">
                    {model.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Models */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
          Image Models
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
          {imageModels?.map((model, idx) => (
            <div
              key={idx}
              className="group flex w-full cursor-pointer items-center gap-3 sm:gap-4 rounded-md"
            >
              <div className="flex grow items-center justify-between border-b border-border group-last:border-none">
                <div className="flex flex-col gap-1 py-3 sm:py-4 w-full h-[120px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ModelLogo model={model.name} size={32} />

                      <h2 className="text-xs sm:text-sm font-medium">
                        {model.displayName}
                      </h2>

                      {/* NEW: Capability Icons */}
                      <div className="flex items-center gap-1 ml-1">
                        {model.isReasoning && (
                          <MyTooltip content="Supports reasoning">
                            <Brain size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsWebSearch && (
                          <MyTooltip content="Supports web search">
                            <Globe size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsImageInput && (
                          <MyTooltip content="Supports image input">
                            <ImageIcon
                              size={12}
                              className="text-foreground/60"
                            />
                          </MyTooltip>
                        )}
                      </div>

                      {model.isProModel && (
                        <span className="bg-orange-500 text-orange-100 rounded-full flex items-center justify-center font-semibold text-[8px] sm:text-[10px] px-1.5 sm:px-2 h-3 sm:h-4 ml-auto">
                          Plus
                        </span>
                      )}
                    </div>

                    <button
                      className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-[#007AFF]"
                      onClick={() => {
                        if (status === "unauthenticated") {
                          setSignInDialog(true);
                        } else if (
                          model.isProModel &&
                          user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                        ) {
                          router.push("/pricing");
                        } else {
                          router.push(`/?model=${model.name}`);
                        }
                      }}
                    >
                      Get
                    </button>
                  </div>

                  <p className="text-sm text-foreground/60 line-clamp-2">
                    {model.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Models */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
          Other Models
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
          {otherModels?.map((model, idx) => (
            <div
              key={idx}
              className="group flex w-full cursor-pointer items-center gap-3 sm:gap-4 rounded-md"
            >
              <div className="flex grow items-center justify-between border-b border-border group-last:border-none">
                <div className="flex flex-col gap-1 py-3 sm:py-4 w-full h-[120px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ModelLogo model={model.name} size={32} />

                      <h2 className="text-xs sm:text-sm font-medium">
                        {model.displayName}
                      </h2>

                      {/* NEW: Capability Icons */}
                      <div className="flex items-center gap-1 ml-1">
                        {model.isReasoning && (
                          <MyTooltip content="Supports reasoning">
                            <Brain size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsWebSearch && (
                          <MyTooltip content="Supports web search">
                            <Globe size={12} className="text-foreground/60" />
                          </MyTooltip>
                        )}
                        {model.supportsImageInput && (
                          <MyTooltip content="Supports image input">
                            <ImageIcon
                              size={12}
                              className="text-foreground/60"
                            />
                          </MyTooltip>
                        )}
                      </div>

                      {model.isProModel && (
                        <span className="bg-orange-500 text-orange-100 rounded-full flex items-center justify-center font-semibold text-[8px] sm:text-[10px] px-1.5 sm:px-2 h-3 sm:h-4 ml-auto">
                          Plus
                        </span>
                      )}
                    </div>

                    <button
                      className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-[#007AFF]"
                      onClick={() => {
                        if (status === "unauthenticated") {
                          setSignInDialog(true);
                        } else if (
                          model.isProModel &&
                          user?.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                        ) {
                          router.push("/pricing");
                        } else {
                          router.push(`/?model=${model.name}`);
                        }
                      }}
                    >
                      Get
                    </button>
                  </div>

                  <p className="text-sm text-foreground/60 line-clamp-2">
                    {model.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
