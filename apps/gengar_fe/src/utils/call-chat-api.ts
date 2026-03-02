import {
  DebateMessage,
  MemorySource,
  ToolResult,
} from "@/components/chat/chat-message";
import {
  IdGenerator,
  JSONValue,
  Message,
  UseChatOptions,
} from "@ai-sdk/ui-utils";

// use function to allow for mocking in tests:
const getOriginalFetch = () => fetch;

export async function callChatApi({
  api,
  body,
  streamProtocol = "data",
  credentials,
  headers,
  abortController,
  restoreMessagesOnFailure,
  onResponse,
  onUpdate,
  onFinish,
  onToolCall,
  generateId,
  fetch = getOriginalFetch(),
}: {
  api: string;
  body: Record<string, any>;
  streamProtocol: "data" | "text" | undefined;
  credentials: RequestCredentials | undefined;
  headers: HeadersInit | undefined;
  abortController: (() => AbortController | null) | undefined;
  restoreMessagesOnFailure: () => void;
  onResponse: ((response: Response) => void | Promise<void>) | undefined;
  onUpdate: (merged: Message[], data: JSONValue[] | undefined) => void;
  onFinish: UseChatOptions["onFinish"];
  onToolCall: UseChatOptions["onToolCall"];
  generateId: IdGenerator;
  fetch: ReturnType<typeof getOriginalFetch> | undefined;
}) {
  const models = body?.models;
  const isDebateMode = body?.isDebateMode;

  // const requestBody = { ...body, model: model, messageId: uuidv4() };
  const requestBody = { ...body, models: models };
  console.log("[callChatApi] Request details:", {
    api,
    hasNewUniqueId: !!body?.newUniqueId,
    hasConversationUniqueId: !!body?.conversationUniqueId,
    models,
    isDebateMode,
    requestBody: JSON.stringify(requestBody, null, 2),
  });

  const response = await fetch(api, {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-No-Buffering": "true",
      ...headers,
    },
    signal: abortController?.()?.signal,
    credentials,
  }).catch((err) => {
    console.error("[callChatApi] Fetch error:", err);
    restoreMessagesOnFailure();
    throw err;
  });

  if (onResponse) {
    try {
      await onResponse(response);
    } catch (err) {
      throw err;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[callChatApi] Response not OK:", {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    restoreMessagesOnFailure();
    throw new Error(errorText ?? "Failed to fetch the chat response.");
  }

  if (!response.body) {
    throw new Error("The response body is empty.");
  }

  const reader = response.body.getReader();

  switch (streamProtocol) {
    case "text": {
      const decoder = new TextDecoder();

      const resultMessage = {
        id: generateId(),
        createdAt: new Date(),
        role: "assistant" as const,
        content: "",
        models: [] as string[],
        toolResults: [] as ToolResult[],
        appDetails: undefined as
          | {
              appId: string;
              appName: string;
              appLogo: string | null;
            }
          | undefined,
        memorySources: [] as MemorySource[],
      };

      const modelMessages = new Map<string, typeof resultMessage>();
      const debateModelMessages = new Map<string, typeof resultMessage>();
      let toolResults: ToolResult[] = [];
      let memorySources: MemorySource[] = [];
      let pendingMemorySources: MemorySource[] = []; // Store memory sources that arrive before message

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE events (terminated by double newline)
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle conversation title for all modes
                if (
                  data.type === "conversation-title" &&
                  data.conversationTitle
                ) {
                  // Dispatch conversation title event
                  window.dispatchEvent(
                    new CustomEvent("conversation-title", {
                      detail: data.conversationTitle,
                    })
                  );
                }

                // Attach Deep Think progress directly to the in-flight assistant message (like tool results)
                if (
                  data.type === "deep-think-progress" &&
                  data.deepThinkProgress
                ) {
                  const models = data.models || [];
                  if (models.length > 0) {
                    const model = models[0];
                    let modelMessage = modelMessages.get(model);
                    if (!modelMessage) {
                      modelMessage = {
                        ...resultMessage,
                        id: generateId(),
                        role: "assistant" as const,
                        content: "",
                        models: models,
                        toolResults: [],
                        memorySources: [],
                      };
                      modelMessages.set(model, modelMessage);
                    }
                    // Append progress
                    const existing =
                      (modelMessage as any).deepThinkProgress || [];
                    const updated = [...existing, data.deepThinkProgress];
                    modelMessages.set(model, {
                      ...modelMessage,
                      deepThinkProgress: updated,
                    } as any);
                    const messages = Array.from(modelMessages.values()).map(
                      (msg) => ({ ...msg })
                    );
                    onUpdate(messages, []);
                  }
                }

                // Handle debate-specific events if in debate mode
                if (isDebateMode) {
                  // Dispatch the event for the ChatApp listener for ALL debate events
                  window.dispatchEvent(
                    new CustomEvent("debate-event", {
                      detail: JSON.stringify(data),
                    })
                  );

                  // Process debate events by dispatching custom events
                  if (
                    data.type &&
                    [
                      "model-response-chunk",
                      "model-response-complete",
                      "initial-debate-round-complete",
                      "moderator-deciding",
                      "debate-ended",
                      "tool-results",
                      "memory-sources",
                    ].includes(data.type)
                  ) {
                    // Handling tool results such as web search - display immediately
                    if (
                      data.type &&
                      data.type === "tool-results" &&
                      data.toolResults
                    ) {
                      // Deduplicate tool results by ID for debate mode
                      const newToolResults = data.toolResults as ToolResult[];
                      const toolMap = new Map<string, ToolResult>();

                      // Add existing tool results to map (use a unique key)
                      toolResults.forEach((t, index) =>
                        toolMap.set(`existing-${index}`, t)
                      );

                      // Add new tool results, overwriting duplicates
                      newToolResults.forEach((t, index) =>
                        toolMap.set(`new-${index}`, t)
                      );

                      // Convert back to array
                      toolResults = Array.from(toolMap.values());

                      // For debate mode, we need to find the current message by messageId or model
                      const models = data.models || [];
                      if (models.length > 0) {
                        const model = models[0];

                        // Update any existing messages from this model with tool results
                        Array.from(debateModelMessages.entries()).forEach(
                          ([messageId, message]) => {
                            if (
                              message.models &&
                              message.models.includes(model)
                            ) {
                              // Create a new message object to ensure React detects the change
                              debateModelMessages.set(messageId, {
                                ...message,
                                toolResults: toolResults,
                              });
                            }
                          }
                        );

                        // Trigger immediate UI update to show tool results in debate mode
                        const uniqueMessages = Array.from(
                          debateModelMessages.values()
                        ).map((msg) => ({ ...msg }));
                        onUpdate(uniqueMessages, []);
                      }
                    }

                    if (data.type === "memory-sources" && data.memorySources) {
                      // Deduplicate memory sources by ID for debate mode
                      const newMemorySources =
                        data.memorySources as MemorySource[];
                      const memoryMap = new Map<string, MemorySource>();

                      // Add existing memory sources to map
                      memorySources.forEach((m) => memoryMap.set(m.id, m));

                      // Add new memory sources, overwriting duplicates
                      newMemorySources.forEach((m) => memoryMap.set(m.id, m));

                      // Convert back to array
                      memorySources = Array.from(memoryMap.values());

                      // Update existing debate messages with memory sources
                      const models = data.models || [];
                      if (models.length > 0) {
                        const model = models[0];

                        Array.from(debateModelMessages.entries()).forEach(
                          ([messageId, message]) => {
                            if (
                              message.models &&
                              message.models.includes(model)
                            ) {
                              // Create a new message object to ensure React detects the change
                              debateModelMessages.set(messageId, {
                                ...message,
                                memorySources: memorySources,
                              });
                            }
                          }
                        );

                        // Trigger immediate UI update to show memory sources in debate mode
                        const uniqueMessages = Array.from(
                          debateModelMessages.values()
                        ).map((msg) => ({ ...msg }));
                        onUpdate(uniqueMessages, []);
                      }
                    }

                    // Handle model-response-chunk for UI update
                    if (
                      data.type === "model-response-chunk" &&
                      data.messageId
                    ) {
                      const messageId = data.messageId as string;
                      const displayName = data.displayName as string;

                      // Get or create the message for this messageId
                      let modelMessage = debateModelMessages.get(messageId);

                      if (!modelMessage) {
                        // Only create a new message if one doesn't exist for this messageId
                        const newMessage = {
                          id: messageId,
                          createdAt: new Date(),
                          role: "assistant" as const,
                          content: "",
                          models: [],
                          toolResults: toolResults,
                          displayName: displayName,
                          appDetails: data.appDetails,
                          memorySources: memorySources,
                        };
                        debateModelMessages.set(messageId, newMessage);
                        modelMessage = newMessage;
                        console.log(
                          "newMessage",
                          JSON.stringify(newMessage, null, 2)
                        );
                      }

                      if (modelMessage && data.content) {
                        // Append the new content
                        modelMessage.content += data.content;

                        // Create a new array with unique messages for reactivity
                        const uniqueMessages = Array.from(
                          debateModelMessages.values()
                        ).map((msg) => ({ ...msg }));

                        console.log(
                          `Updating message ${messageId}, total unique messages:`,
                          uniqueMessages.length
                        );
                        onUpdate(uniqueMessages, []);
                      }
                    }
                  }

                  // For non-debate mode
                } else {
                  // Handle tool results chunk - display immediately
                  if (data.type === "tool-results" && data.toolResults) {
                    // Deduplicate tool results by ID
                    const newToolResults = data.toolResults as ToolResult[];
                    const toolMap = new Map<string, ToolResult>();

                    // Add existing tool results to map (use a unique key)
                    toolResults.forEach((t, index) =>
                      toolMap.set(`existing-${index}`, t)
                    );

                    // Add new tool results, overwriting duplicates
                    newToolResults.forEach((t, index) =>
                      toolMap.set(`new-${index}`, t)
                    );

                    // Convert back to array
                    toolResults = Array.from(toolMap.values());

                    // Create immediate update to show tool results
                    const models = data.models || [];
                    if (models.length > 0) {
                      const model = models[0];
                      let modelMessage = modelMessages.get(model);

                      if (!modelMessage) {
                        modelMessage = {
                          ...resultMessage,
                          role: "assistant" as const,
                          content: "",
                          models: models,
                          toolResults: toolResults,
                          memorySources: memorySources,
                        };
                        modelMessages.set(model, modelMessage);
                      } else {
                        // Create a new message object to ensure React detects the change
                        modelMessages.set(model, {
                          ...modelMessage,
                          toolResults: toolResults,
                        });
                      }

                      // Trigger immediate UI update to show tool results
                      const messages = Array.from(modelMessages.values()).map(
                        (msg) => ({ ...msg })
                      );
                      onUpdate(messages, []);
                    }
                  }

                  if (data.type === "memory-sources" && data.memorySources) {
                    // Deduplicate memory sources by ID
                    const newMemorySources =
                      data.memorySources as MemorySource[];
                    const memoryMap = new Map<string, MemorySource>();

                    // Add existing memory sources to map
                    memorySources.forEach((m) => memoryMap.set(m.id, m));

                    // Add new memory sources, overwriting duplicates
                    newMemorySources.forEach((m) => memoryMap.set(m.id, m));

                    // Convert back to array
                    memorySources = Array.from(memoryMap.values());

                    // Store pending memory sources
                    pendingMemorySources = memorySources;

                    // Update existing messages with memory sources
                    const models = data.models || [];
                    if (models.length > 0) {
                      const model = models[0];
                      let modelMessage = modelMessages.get(model);

                      if (!modelMessage) {
                        // Create a new message if one doesn't exist
                        modelMessage = {
                          ...resultMessage,
                          id: generateId(), // Ensure unique ID
                          role: "assistant" as const,
                          content: "",
                          models: models,
                          toolResults: toolResults,
                          memorySources: memorySources,
                          appDetails: data.appDetails,
                        };
                        modelMessages.set(model, modelMessage);

                        // Immediately trigger update for the new message with memory sources
                        const messages = Array.from(modelMessages.values()).map(
                          (msg) => ({ ...msg })
                        );
                        onUpdate(messages, []);
                      } else {
                        // Create a new message object to ensure React detects the change
                        const updatedMessage = {
                          ...modelMessage,
                          memorySources: memorySources,
                        };
                        modelMessages.set(model, updatedMessage);

                        // Immediately trigger update
                        const messages = Array.from(modelMessages.values()).map(
                          (msg) => ({ ...msg })
                        );
                        onUpdate(messages, []);
                      }
                    } else {
                    }
                  }

                  // Handle text chunk
                  if (
                    data.type === "text" &&
                    data.content &&
                    data.models &&
                    data.models.length > 0
                  ) {
                    const model = data.models[0];
                    let modelMessage = modelMessages.get(model);

                    if (!modelMessage) {
                      // Use pending memory sources if available
                      const sourcesToUse =
                        memorySources.length > 0
                          ? memorySources
                          : pendingMemorySources;
                      modelMessage = {
                        ...resultMessage,
                        id: generateId(),
                        role: "assistant" as const,
                        content: "",
                        models: data.models,
                        toolResults: toolResults,
                        memorySources: sourcesToUse,
                        appDetails: data.appDetails,
                      };
                      modelMessages.set(model, modelMessage);
                    }

                    // Create a new message object with updated content
                    const updatedMessage = {
                      ...modelMessage,
                      content: modelMessage.content + data.content,
                    };
                    modelMessages.set(model, updatedMessage);

                    // Create new message objects for update (required for reactivity)
                    const messages = Array.from(modelMessages.values()).map(
                      (msg) => ({
                        ...msg,
                      })
                    );

                    onUpdate(messages, []);
                  }

                  if (data.error) {
                    const errorMessage = {
                      id: generateId(),
                      createdAt: new Date(),
                      role: "assistant" as const,
                      content: data.error,
                    };
                    onUpdate([errorMessage], []);
                  }
                }
              } catch (error) {
                console.error("Error parsing SSE data:", error);
              }
            }
          }
        }

        if (abortController?.() === null) {
          reader.cancel();
          break;
        }
      }

      // Final update with all messages
      const finalMessages = Array.from(modelMessages.values());
      if (finalMessages.length > 0) {
        onFinish?.(finalMessages[finalMessages.length - 1], {
          usage: { completionTokens: NaN, promptTokens: NaN, totalTokens: NaN },
          finishReason: "unknown",
        });
      } else if (isDebateMode) {
        // For debate mode, trigger onFinish when we have debate messages
        const debateMessages = Array.from(debateModelMessages.values());
        if (debateMessages.length > 0) {
          // Call onFinish with the last debate message
          onFinish?.(debateMessages[debateMessages.length - 1], {
            usage: {
              completionTokens: NaN,
              promptTokens: NaN,
              totalTokens: NaN,
            },
            finishReason: "unknown",
          });
        }
      }

      return {
        messages: finalMessages,
        data: [],
      };
    }
  }

  return {
    messages: [],
    data: [],
  };
}
