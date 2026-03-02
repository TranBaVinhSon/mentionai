import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";
import { Button } from "@/components/ui/button";
import { MDX } from "../mdx";
import { Spinner } from "./chat-message";
import { X, MessageCircle } from "lucide-react";
import { askFollowupQuestionOfHighlightedText } from "@/app/actions/ask-followup-question";
import { cn } from "@/lib/utils";
import { ArrowRight as ArrowRight02Icon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QAResponse {
  question: string;
  answer: string;
}

interface TextSelectionCommentProps {
  messageId: string;
  onClose: () => void;
  selectedText: string;
  position: { x: number; y: number };
  removeHighlight: () => void;
}

export const TextSelectionComment = ({
  messageId,
  onClose,
  selectedText,
  position,
  removeHighlight,
}: TextSelectionCommentProps) => {
  const { data: session, status } = useSession();
  const [responses, setResponses] = useState<QAResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    if (status === "unauthenticated") {
      setSignInDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await askFollowupQuestionOfHighlightedText(
        input,
        selectedText
      );
      setResponses((prev) => [...prev, { question: input, answer: response }]);
      setInput("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to get response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    removeHighlight();
    onClose();
  };

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInput(textarea.value);

    // Reset height to auto to properly calculate new height
    textarea.style.height = "auto";
    // Set new height based on scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          style={{ position: "absolute", top: position.y, left: position.x }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        sideOffset={5}
        avoidCollisions
      >
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageCircle size={16} className="flex-shrink-0" />
            <span className="line-clamp-1 flex-1">
              Ask about {selectedText}
            </span>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {responses.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">
                Ask questions about the highlighted text to dive deeper into the
                topics. Or simply translate it to another language.
              </p>
            </div>
          )}

          {responses.length > 0 && (
            <div className="flex flex-col gap-6 p-3">
              {responses.map((response, index) => (
                <div key={index}>
                  {/* Question */}
                  <div className="flex items-start gap-2">
                    <img
                      src={session?.user?.image || ""}
                      alt={session?.user?.name || "User"}
                      className="w-6 h-6 rounded-full mt-1"
                    />
                    <div className="flex-1 text-sm bg-muted/60 rounded-lg px-3 py-2">
                      {response.question}
                    </div>
                  </div>
                  {/* Answer */}
                  <div className="flex-1 rounded-lg bg-muted/60 px-3 py-2 text-sm mt-2">
                    <MDX messageId={`${messageId}-${index}`} animate={false}>
                      {response.answer}
                    </MDX>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4">
              <Spinner />
              <span>Generating response...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-3 border-t">
          <div className="relative flex items-start justify-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              placeholder="Type your question..."
              className={cn(
                "flex w-full rounded-md border border-input bg-background py-2 px-3 text-sm pr-10",
                "ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "resize-none min-h-[38px] max-h-[200px]"
              )}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className={cn(
                "absolute w-7 h-7 rounded-lg",
                "right-2",
                input.includes("\n") ? "bottom-2" : "top-[5px]"
              )}
            >
              <ArrowRight02Icon size={18} />
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
