import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance, Props, GetReferenceClientRect } from "tippy.js";
import "tippy.js/animations/scale.css";

import { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./mention-list";
import { App, Model } from "@/services/api";
import { useModelStore } from "@/store/model";
import { useAppStore } from "@/store/app";

export const createSuggestion = (
  getModels: () => Model[],
  getApps: () => App[],
  getUserApp?: () => App | null,
  onMentionToggle?: (active: boolean) => void
): Omit<SuggestionOptions, "editor"> => ({
  char: "@",
  items: async ({ query }) => {
    const models = getModels() || (await useModelStore.getState().getModels());
    const apps = getApps();
    const userApp = getUserApp?.();

    const appsToModels = apps.map((app) => ({
      ...app,
      modelType: "app",
    }));

    // Prepare all items
    const allModels = models;
    const allApps = appsToModels;

    // Filter items based on query
    const filteredModels = allModels.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    const filteredApps = allApps.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );

    // Create digital clone items array
    const digitalCloneItems = [];

    // If user has a digital clone and query matches "me", add it to digital clone section
    if (userApp && userApp.uniqueId && "me".includes(query.toLowerCase())) {
      const meApp = {
        ...userApp,
        name: "me",
        displayName: "Me",
        modelType: "digital clone",
        isMe: true,
      };
      digitalCloneItems.push(meApp);
    }

    // Return items in order: digital clone, models, apps
    return [...digitalCloneItems, ...filteredModels, ...filteredApps];
  },

  render: () => {
    let component: ReactRenderer;
    let popup: Instance<Props>[];

    return {
      onStart: (props) => {
        // Notify that mention is active
        onMentionToggle?.(true);

        component = new ReactRenderer(MentionList, {
          props: {
            ...props,
            onExit: () => {
              popup[0].destroy();
              component.destroy();
              // Notify that mention is no longer active
              onMentionToggle?.(false);
            },
            clearContent: () => {
              props.editor.commands.clearContent(true);
            },
          },
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        // Determine if we're on mobile
        const isMobile = window.innerWidth < 768;

        // Use different reference elements for desktop vs mobile
        let getReferenceClientRect: GetReferenceClientRect;

        if (isMobile) {
          // For mobile, use the actual cursor position
          getReferenceClientRect = props.clientRect as GetReferenceClientRect;
        } else {
          // For desktop, use the desktop chat editor
          const chatEditor = document.getElementById("chat-editor");

          const clientRect = () => chatEditor?.getBoundingClientRect();
          clientRect.contextElement = chatEditor as Element;
          getReferenceClientRect = clientRect as GetReferenceClientRect;
        }

        popup = tippy("body", {
          getReferenceClientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: isMobile ? "top-start" : "top",
          animation: "scale",
          maxWidth: window.innerWidth >= 768 ? 768 : "calc(100vw - 20px)",
          offset: isMobile ? [0, 8] : undefined,
          popperOptions: isMobile
            ? {
                modifiers: [
                  {
                    name: "flip",
                    options: {
                      fallbackPlacements: ["bottom-start", "top-start"],
                    },
                  },
                  {
                    name: "preventOverflow",
                    options: {
                      boundary: "viewport",
                      padding: 10,
                    },
                  },
                ],
              }
            : undefined,
        });
      },

      onUpdate(props) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          popup[0].hide();

          return true;
        }

        // @ts-ignore
        return component.ref?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
        // Notify that mention is no longer active
        onMentionToggle?.(false);
      },
    };
  },
});
