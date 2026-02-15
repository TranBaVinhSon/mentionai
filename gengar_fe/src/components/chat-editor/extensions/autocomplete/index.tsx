import { Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ReactRenderer } from "@tiptap/react";
import { forwardRef, MutableRefObject, Ref } from "react";
import tippy, { Instance, Props, GetReferenceClientRect } from "tippy.js";

function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const output = callback(...args);
          resolve(output);
        } catch (err) {
          reject(err);
        }
      }, delay);
    });
  };
}

const AcceptButton = forwardRef<HTMLButtonElement, { onAccept: () => void }>(
  ({ onAccept }, ref) => {
    return (
      <button
        className="bg-sidebar-primary cursor-pointer text-[11px] flex items-center justify-center h-6 px-2 rounded-md text-white font-semibold"
        ref={ref}
        onClick={onAccept}
      >
        <span className="mr-1">👌</span>
        <span>Accept</span>
      </button>
    );
  }
);

export const AutocompleteExtension = Node.create<
  {
    applySuggestionKey: string;
    suggestionDebounce: number;
    prompt: string;
    enabled?: MutableRefObject<boolean>;
    getReadableState: () => {
      description: string;
      value: any;
    };
  },
  {
    getSuggestion:
      | ((
          previousText: string,
          cb: (suggestion: string | null) => void
        ) => void)
      | undefined;
    suggestion: string | null;
  }
>({
  name: "suggestion",

  addOptions() {
    return {
      applySuggestionKey: "Tab",
      suggestionDebounce: 500,
      previousTextLength: 4000,
      prompt: "",
      // enabled: { current: false },
      getReadableState: () => ({
        description: "",
        value: "",
      }),
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey<DecorationSet>("suggestion");

    const editor = this.editor;
    const options = this.options;

    let component: ReactRenderer | undefined;
    let popup: Instance<Props>[] | undefined;
    let suggestionAccepted = false; // Flag to track if a suggestion was accepted

    const getSuggestion = debounce(
      async (
        textBeforeCursor: string,
        textAfterCursor: string,
        cb: (suggestion: string | null) => void
      ) => {
        console.log("getSuggestion", textBeforeCursor, textAfterCursor);
        if (suggestionAccepted) {
          suggestionAccepted = false; // Reset the flag
          cb(null);
          return; // Skip fetching a new suggestion
        }

        const lastChar = textBeforeCursor[textBeforeCursor.length - 1];
        if (lastChar === "@" || !(textBeforeCursor + textAfterCursor)) {
          cb(null);
          return;
        }
        try {
          const readableState = this.options.getReadableState();

          const response = await fetch("/api/autocomplete", {
            method: "POST",
            body: JSON.stringify({
              textBeforeCursor,
              textAfterCursor,
              readableState,
              prompt: this.options.prompt,
            }),
          });

          const { text } = await response.json();
          cb(text);
        } catch (error) {
          cb(null);
        }
      },
      this.options.suggestionDebounce
    );

    const insertText = (text: string, cursorPos?: number) => {
      const tr = editor.state.tr;
      tr.insertText(text, cursorPos || editor.state.selection.from);
      tr.setMeta("addToHistory", false);
      tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
      editor.view.dispatch(tr);
      suggestionAccepted = true; // Set the flag after inserting text
    };

    const destroyPopup = () => {
      if (component) {
        component.destroy();
        component = undefined;
      }

      if (popup) {
        popup.forEach((p) => {
          p.destroy();
        });
        popup = undefined;
      }
    };

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldValue) {
            if (tr.docChanged) {
              suggestionAccepted = false; // Reset the flag when the document changes
            }
            if (tr.getMeta(pluginKey)) {
              // Update the decoration state based on the async data
              const { decorations } = tr.getMeta(pluginKey);
              return decorations;
            }
            return tr.docChanged ? oldValue.map(tr.mapping, tr.doc) : oldValue;
          },
        },
        view() {
          return {
            update(view, prevState) {
              // This will add the widget decoration at the cursor position
              const selection = view.state.selection;
              const cursorPos = selection.$head.pos;
              const nextNode = view.state.doc.nodeAt(cursorPos);

              const resetSuggestion = () => {
                const tr = view.state.tr;
                tr.setMeta("addToHistory", false);
                tr.setMeta(pluginKey, { decorations: DecorationSet.empty });
                view.dispatch(tr);
                destroyPopup();
              };

              // If the cursor is not at the end of the block and we have a suggestion => hide the suggestion
              if (
                nextNode &&
                !nextNode.isBlock &&
                pluginKey.getState(view.state)?.find().length
              ) {
                resetSuggestion();
                return;
              }

              // If the document didn't change, do nothing
              if (prevState && prevState.doc.eq(view.state.doc)) {
                return;
              }

              // reset the suggestion before fetching a new one
              setTimeout(() => {
                resetSuggestion();
              }, 0);

              if (!options.enabled?.current) {
                destroyPopup();
                return;
              }

              // fetch a new suggestion
              //   const previousText = view.state.doc
              // const previousText = view.state.doc
              //     .textBetween(0, view.state.doc.content.size, " ")
              //     .slice(-4000);
              const textBeforeCursor = view.state.doc.textBetween(
                0,
                view.state.selection.$head.pos
              );
              const textAfterCursor = view.state.doc.textBetween(
                view.state.selection.$head.pos,
                view.state.doc.content.size
              );

              getSuggestion(textBeforeCursor, textAfterCursor, (suggestion) => {
                destroyPopup();
                if (!suggestion) return;

                const updatedState = view.state;

                const cursorPos = updatedState.selection.$head.pos;
                const suggestionDecoration = Decoration.widget(
                  cursorPos,
                  () => {
                    const parentNode = document.createElement("span");
                    const addSpace = nextNode && nextNode.isText ? " " : "";

                    parentNode.innerHTML = `${addSpace}${suggestion}`;
                    parentNode.classList.add("autocomplete-suggestion");

                    const clientRect = () => parentNode.getBoundingClientRect();
                    clientRect.contextElement = parentNode as Element;

                    if (!component) {
                      component = new ReactRenderer(AcceptButton, {
                        props: {
                          onAccept: () => {
                            insertText(suggestion, cursorPos);
                            editor.commands.focus();
                          },
                        },
                        editor,
                      });
                    }

                    if (!popup) {
                      popup = tippy("body", {
                        getReferenceClientRect:
                          clientRect as GetReferenceClientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "top-start",
                      });
                    }

                    return parentNode;
                  },
                  { side: 1 }
                );

                const decorations = DecorationSet.create(updatedState.doc, [
                  suggestionDecoration,
                ]);
                const tr = view.state.tr;
                tr.setMeta("addToHistory", false);
                tr.setMeta(pluginKey, { decorations });
                view.dispatch(tr);
              });
            },
          };
        },
        props: {
          decorations(editorState) {
            return pluginKey.getState(editorState);
          },
          handleKeyDown(view, event) {
            if (!options.enabled?.current) {
              return false;
            }

            const pluginState = pluginKey.getState(view.state);
            if (event.key === "Tab" && pluginState) {
              const suggestionDecoration = pluginState.find()[0];
              if (suggestionDecoration) {
                const suggestionElement = (
                  suggestionDecoration as any
                ).type.toDOM();

                const suggestionText =
                  suggestionElement.innerHTML || suggestionElement.textContent;

                insertText(suggestionText, view.state.selection.from);
                destroyPopup();

                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
