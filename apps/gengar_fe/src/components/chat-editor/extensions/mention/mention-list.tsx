import { Model, App, MentionItem, toMentionItem } from "@/services/api";
import clsx from "clsx";
import { Lock as SquareLock02Icon } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  Ref,
  useMemo,
} from "react";
import { MyTooltip } from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import ModelLogo from "@/components/shared/model-logo";
import { useUser } from "@/hooks/use-user";
import { setSignInDialog } from "@/store/app";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/shared/app-logo";
import { useChatStore } from "@/store/chat";
import { Brain, Globe, Image as ImageIcon } from "lucide-react";

// Global declaration for app ID mapping
declare global {
  interface Window {
    appUniqueIds?: Record<string, string>;
  }
}

interface MentionListProps {
  items: (Model | App)[];
  command: (item: { id: string }) => void;
  clearContent: () => void;
  onExit: () => void;
}

function groupByType(items: MentionItem[]) {
  return items.reduce((acc, item) => {
    const type = item.modelType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {} as { [key: string]: MentionItem[] });
}

export const MentionList = forwardRef(
  (
    props: MentionListProps,
    ref: Ref<{ onKeyDown: (event: { event: KeyboardEvent }) => boolean }>
  ) => {
    const router = useRouter();
    const isDebateMode = useChatStore((state) => state.isDebateMode);

    const items = useMemo(() => {
      // First convert items, preserving the modelType we set
      const convertedItems = props.items.map((item: any) => {
        if ('modelType' in item && item.modelType === 'digital clone') {
          // Preserve digital clone type
          return {
            ...toMentionItem(item),
            modelType: 'digital clone' as const
          } as MentionItem;
        }
        return toMentionItem(item);
      });
      return groupByType(convertedItems);
    }, [props.items]);

    const flatItems = useMemo(() => {
      return Object.values(items)
        .flat()
        .map((item, index) => ({ ...item, index }));
    }, [items]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const { status } = useSession();
    const { data: user } = useUser();

    const selectItem = (index: number) => {
      const item = flatItems[index];
      if (item) {
        if (
          "isLoginRequired" in item &&
          item.isLoginRequired &&
          status === "unauthenticated"
        ) {
          props.onExit();
          props.clearContent();
          setSignInDialog(true);
          return;
        }

        if (
          "isProModel" in item &&
          item.isProModel &&
          user?.subscriptionPlan !== "plus"
        ) {
          props.onExit();
          router.push("/pricing");
          return;
        }

        if (item.modelType === "app" && !isDebateMode) {
          if (item.uniqueId) {
            const searchParams = new URLSearchParams();
            searchParams.set("app", item.uniqueId);
            props.onExit();
            props.clearContent();
            router.push(`/?${searchParams.toString()}`);
            return;
          }
        }
        
        // Handle digital clone selection
        if (item.modelType === "digital clone" && !isDebateMode) {
          if (item.uniqueId) {
            const searchParams = new URLSearchParams();
            searchParams.set("app", item.uniqueId);
            props.onExit();
            props.clearContent();
            router.push(`/?${searchParams.toString()}`);
            return;
          }
        }

        // For app mentions in debate mode, store the full display name
        if ((item.modelType === "app" || item.modelType === "digital clone") && isDebateMode && item.uniqueId) {
          // Initialize the global mapping if it doesn't exist
          if (typeof window !== "undefined") {
            if (!window.appUniqueIds) {
              window.appUniqueIds = {};
            }

            // Store the mapping using both the display name and the name
            window.appUniqueIds[item.displayName] = item.uniqueId;
            window.appUniqueIds[item.name] = item.uniqueId; // Store by name as well
            
            // Special handling for @me
            if ("isMe" in item && item.isMe) {
              window.appUniqueIds["me"] = item.uniqueId;
            }
          }

          // Use the name for the mention, consistent with models
          props.command({ id: item.name });
        } else if ((item.modelType === "app" || item.modelType === "digital clone") && "isMe" in item && item.isMe) {
          // Handle @me outside debate mode
          if (typeof window !== "undefined") {
            if (!window.appUniqueIds) {
              window.appUniqueIds = {};
            }
            if (item.uniqueId) {
              window.appUniqueIds["me"] = item.uniqueId;
            }
          }
          props.command({ id: item.name });
        } else {
          props.command({ id: item.name });
        }
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + flatItems.length - 1) % flatItems.length
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % flatItems.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [flatItems]);

    useEffect(() => {
      const item = flatItems[selectedIndex];
      if (!item) return;
      const node = document.getElementById(item.name);
      if (node)
        node.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="bg-background border border-border rounded-xl w-full max-h-64 overflow-x-hidden overflow-y-auto max-w-full shadow-sm">
        {Object.entries(items).map(([modelType, models]) => {
          return (
            <div key={modelType} className="py-1.5 pb-2 border-b border-border">
              <div className="flex px-3.5 mt-1.5 mb-2 text-foreground/40 text-sm md:text-xs font-medium leading-tight">
                {modelType}
              </div>
              {models.map((item) => {
                const modelIndex = flatItems.findIndex(
                  (i) => i.name === item.name
                );
                const isApp = item.modelType === "app";
                const isDigitalClone = item.modelType === "digital clone";

                return (
                  <div id={item.name} key={`${modelType}-${item.name}-${item.uniqueId || item.id || 'default'}`} className="px-2 py-px">
                    <div
                      className={clsx(
                        `px-1 w-full rounded-lg overflow-hidden hover:bg-muted text-base md:text-sm h-11 md:h-10 flex items-center justify-between`,
                        selectedIndex === modelIndex && "bg-muted"
                      )}
                      onClick={() => selectItem(modelIndex)}
                    >
                      <div className="flex flex-1 overflow-hidden items-center mr-2">
                        <div className="flex items-center">
                          {isDigitalClone ? (
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-muted">
                              <AppLogo logo={item.logo} size={20} />
                            </div>
                          ) : isApp ? (
                            <AppLogo logo={item.logo} size={20} />
                          ) : (
                            <ModelLogo size={20} model={item.name} />
                          )}
                          <div className="text-base md:text-sm mx-2 text-foreground">
                            {isApp || isDigitalClone ? item.displayName : item.name}
                          </div>
                        </div>
                        <div className="flex-1 text-sm md:text-xs text-foreground/40 truncate">
                          {item.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isApp &&
                          item.isLoginRequired &&
                          status !== "authenticated" && (
                            <SquareLock02Icon
                              size={16}
                              className="cursor-pointer"
                            />
                          )}
                        {!isApp && (
                          <div className="flex items-center gap-1.5">
                            {item.isReasoning && (
                              <MyTooltip content="Supports reasoning">
                                <Brain
                                  size={14}
                                  className="text-foreground/60"
                                />
                              </MyTooltip>
                            )}
                            {item.supportsWebSearch && (
                              <MyTooltip content="Supports web search">
                                <Globe
                                  size={14}
                                  className="text-foreground/60"
                                />
                              </MyTooltip>
                            )}
                            {item.supportsImageInput && (
                              <MyTooltip content="Supports image input">
                                <ImageIcon
                                  size={14}
                                  className="text-foreground/60"
                                />
                              </MyTooltip>
                            )}
                          </div>
                        )}
                        {!isApp && (
                          <span
                            className={clsx(
                              "rounded-full flex items-center justify-center font-semibold text-xs md:text-[10px] px-2 h-5 md:h-4",
                              item.isProModel
                                ? "bg-orange-500 text-orange-100"
                                : "bg-blue-500 text-blue-100"
                            )}
                          >
                            {item.isProModel ? "Plus" : "Free"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
);
