"use client";
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Placeholder from "@tiptap/extension-placeholder";
import History from "@tiptap/extension-history";
import Mention from "@tiptap/extension-mention";
import HardBreak from "@tiptap/extension-hard-break";
import { createSuggestion } from "./extensions/mention";
import { AutocompleteExtension } from "./extensions/autocomplete";
import { useModels } from "@/hooks/use-models";
import { App, Model } from "@/services/api";
import { useLatest } from "@/hooks/use-latest";
import { useChatStore } from "@/store/chat";
import { useOfficialAppsLazy } from "@/hooks/use-official-apps-lazy";
import { useUser } from "@/hooks/use-user";

import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";

export const ShiftEnterToLineBreak = Extension.create({
  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => {
        return this.editor.commands.enter();
      },
    };
  },
});

export const DisableEnter = Extension.create({
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
    };
  },
});

export interface ChatEditorClientProps {
  className?: string;
  onCreate?: () => void;
  onEnter: (content: string, s3Links?: string[]) => void;
  autoFocus?: boolean;
  placeholder: string;
  getFiles: () => string[] | undefined;
  getReadableState?: () => {
    description: string;
    value: any;
  };
}

export const ChatEditorClient = memo(
  forwardRef(
    (
      {
        className,
        onCreate,
        onEnter,
        autoFocus,
        placeholder,
        getFiles,
        getReadableState,
      }: ChatEditorClientProps,
      ref
    ) => {
      const models = useModels();
      const [mentionActive, setMentionActive] = useState(false);
      const { apps } = useOfficialAppsLazy(mentionActive);
      const { data: user } = useUser();
      const modelsRef = useLatest(models);
      const appsRef = useLatest(apps || []);
      const userRef = useLatest(user);
      const isAiEditing = useChatStore((state) => state.isAiEditing);
      const isAiEditingRef = useLatest(isAiEditing);
      const editor = useEditor({
        extensions: [
          // StarterKit.configure(),
          // Highlight,
          // Typography,
          Document,
          Paragraph,
          Text,
          Placeholder.configure({
            // Use a placeholder:
            placeholder,
          }),
          History,
          ShiftEnterToLineBreak,
          HardBreak,
          DisableEnter,
          Mention.configure({
            HTMLAttributes: {
              class:
                "rounded p-0.5 bg-orange-500/15 text-orange-500 border border-orange-200 dark:border-orange-500",
            },
            suggestion: createSuggestion(
              () => modelsRef.current as Model[],
              () => appsRef.current as App[],
              () => userRef.current?.app || null,
              setMentionActive
            ),
            renderText({ node }) {
              return `@${node.attrs.label ?? node.attrs.id}`;
            },
          }),
          // AutocompleteExtension.configure({
          //   getReadableState,
          //   enabled: isAiEditingRef,
          // }),
        ],
        editorProps: {
          attributes: {
            class: `focus:outline-none ${className}`,
          },
        },
        autofocus: !!autoFocus,
        immediatelyRender: false,
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
          editor.view.dom.setAttribute("autocomplete", "off");
          editor.view.dom.setAttribute("autocapitalize", "off");
          editor.view.dom.setAttribute("data-gramm", "false");
          editor.view.dom.setAttribute("data-gramm_editor", "false");
          editor.view.dom.setAttribute("data-enable-grammarly", "false");
          onCreate?.();
        },
      });

      // Add this effect to update the placeholder when it changes
      useEffect(() => {
        if (editor) {
          editor.extensionManager.extensions.filter(
            (extension) => extension.name === "placeholder"
          )[0].options.placeholder = placeholder;
        }
      }, [placeholder, editor]);

      const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.nativeEvent.isComposing) return;

        const message = editor?.getText();

        if (!message) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const s3Links = getFiles();
          onEnter(message, s3Links);
          editor?.commands.setContent("");
        }
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          e.currentTarget.scrollTop = e.currentTarget.scrollHeight;
        }
      };

      useImperativeHandle(ref, () => editor);

      return (
        <EditorContent
          autoFocus={autoFocus}
          editor={editor}
          onKeyDown={handleKeyDown}
          className="flex-1"
          data-gramm="false"
        />
      );
    }
  ),
  (prevProps, nextProps) => {
    return prevProps.placeholder === nextProps.placeholder;
  }
);
