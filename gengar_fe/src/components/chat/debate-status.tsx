import { useEffect, useState } from "react";
import { Spinner } from "./chat-message";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  MessageSquare,
  User,
  Hourglass,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

// Backend event types (for reference)
type DebateEventType =
  | "debate-started"
  | "moderator-deciding"
  | "moderator-decision"
  | "debate-ended"
  | "awaiting-human-response"
  | "model-thinking-start"
  | "initial-debate-round-complete"
  | "model-thinking"
  | "model-response-chunk"
  | "model-response-complete"
  | "model-error"
  | "debate-round-complete"
  | "debate-paused";

// UI status types that correspond to debate events or UI states
export type DebateStatusType =
  | "not-started"
  | "debug-mode"
  | "started"
  | "thinking"
  | "in-progress"
  | "moderating"
  | "round-complete"
  | "awaiting-human-response"
  | "ended"
  | "debate-paused";

// Event to status mapping function for reference
const mapEventToStatus = (event: DebateEventType): DebateStatusType => {
  switch (event) {
    case "debate-started":
      return "started";
    case "moderator-deciding":
      return "moderating";
    case "debate-ended":
      return "ended";
    case "awaiting-human-response":
      return "awaiting-human-response";
    case "model-thinking":
    case "model-thinking-start":
      return "thinking";
    case "debate-round-complete":
    case "initial-debate-round-complete":
      return "round-complete";
    case "model-response-chunk":
    case "model-response-complete":
      return "in-progress";
    case "debate-paused":
      return "debate-paused";
    case "model-error":
      // This might need special handling with the error props
      return "in-progress";
    default:
      return "in-progress";
  }
};

interface DebateStateProps {
  status: DebateStatusType;
  speaker: string; // current speaker
  humanInputMessage?: string;
  error?: string;
  lastErrorModel?: string;
  lastErrorMessage?: string;
  currentRound?: number;
  lastSpeaker?: string;
}

// Make DebateStatus purely presentational, relying on props
export function DebateStatus({
  status,
  speaker,
  humanInputMessage,
  error,
  lastErrorModel,
  lastErrorMessage,
  currentRound,
  lastSpeaker,
}: DebateStateProps) {
  // State for UI effects (visibility, hover)
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);

  // Track debate timeline history with more detailed information
  const [statusHistory, setStatusHistory] = useState<
    {
      status: DebateStatusType;
      timestamp: Date;
      models?: string[];
      speaker?: string;
      message?: string;
    }[]
  >([]);

  // Effect to track status changes for timeline
  useEffect(() => {
    // Create entry with current relevant information
    const newEntry = {
      status,
      timestamp: new Date(),
      speaker: ["in-progress"].includes(status) ? speaker : undefined,
      message:
        status === "awaiting-human-response" ? humanInputMessage : undefined,
    };

    // Only add to history if status changed or if speaker have changed
    const shouldAdd =
      statusHistory.length === 0 ||
      statusHistory[statusHistory.length - 1].status !== status ||
      (status === "in-progress" &&
        JSON.stringify(statusHistory[statusHistory.length - 1].speaker) !==
          JSON.stringify(newEntry.speaker));

    if (shouldAdd) {
      setStatusHistory((prev) => [...prev, newEntry]);
    }
  }, [status, speaker, humanInputMessage, statusHistory]);

  // Hide the component entirely if status is "not-started" or unknown
  if (status === "not-started" || !status) {
    return null;
  }

  // Function to get appropriate status text and icon based on status
  const getStatusContent = (
    statusType: DebateStatusType,
    speaker?: string,
    message?: string
  ) => {
    switch (statusType) {
      case "debug-mode":
        return {
          text: `Debug Mode`,
          icon: <Spinner className="mr-2 h-4 w-4" />,
        };
      case "started":
        return {
          text: "Debate Started",
          icon: <MessageSquare className="mr-2 h-4 w-4" />,
        };
      case "thinking":
        return {
          text: speaker ? `${speaker} is thinking...` : "Thinking...",
          icon: <Hourglass className="mr-2 h-4 w-4" />,
        };
      case "in-progress":
        return {
          text: speaker ? `${speaker} is speaking` : "Debating...",
          icon: <MessageSquare className="mr-2 h-4 w-4" />,
        };
      case "moderating":
        return {
          text: "Moderator deciding",
          icon: <Clock className="mr-2 h-4 w-4" />,
        };
      case "round-complete":
        return {
          text: "Round Complete",
          icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        };
      case "awaiting-human-response":
        return {
          text: message ? message : "Awaiting your response",
          icon: <User className="mr-2 h-4 w-4" />,
        };
      case "ended":
        return {
          text: "Debate Ended",
          subtext: "Waiting for your response",
          icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        };
      case "debate-paused":
        return {
          text: "Debate Paused",
          subtext: "Waiting for your response",
          icon: <PauseCircle className="mr-2 h-4 w-4" />,
        };
      default:
        return {
          text: "Unknown",
          icon: <AlertCircle className="mr-2 h-4 w-4" />,
        };
    }
  };

  // Get current status content with additional context
  const currentStatusContent = getStatusContent(
    status,
    speaker,
    humanInputMessage
  );

  // Determine if we should pulse the indicator
  const shouldPulse = [
    "thinking",
    "moderating",
    "awaiting-human-response",
  ].includes(status);

  // Function to format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Filter out any Unknown status entries from the history display
  const filteredStatusHistory = statusHistory.filter(
    (item) => item.status !== "not-started"
  );

  return (
    <div
      className={cn(
        "fixed right-4 top-1/2 -translate-y-1/2 rounded-lg shadow-lg z-50 transition-opacity duration-200",
        hovering ? "opacity-100" : "opacity-95",
        "min-w-[220px] max-w-[300px]",
        "hidden md:block"
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Current Status */}
      <div
        className={cn(
          "flex flex-col p-3 rounded-t-lg text-white",
          status === "awaiting-human-response"
            ? "bg-green-500"
            : lastErrorMessage
            ? "bg-red-500"
            : "bg-orange-500",
          shouldPulse && "animate-pulse"
        )}
      >
        <div className="flex items-center">
          {currentStatusContent.icon}
          <span className="text-sm font-medium">
            {currentStatusContent.text}
          </span>
        </div>
        {currentStatusContent.subtext && (
          <div className="text-xs mt-1 ml-6">
            {currentStatusContent.subtext}
          </div>
        )}
      </div>

      {/* Timeline of Status Changes */}
      <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-b-lg max-h-[300px] overflow-y-auto">
        <h4 className="text-xs font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Conversation Timeline
        </h4>

        <div className="space-y-2">
          {filteredStatusHistory.length > 0 ? (
            filteredStatusHistory.map((item, index) => {
              const { text, icon } = getStatusContent(
                item.status,
                item.speaker,
                item.message
              );

              // Skip rendering entries with empty text
              if (!text) return null;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center text-xs p-1.5 border-l-2",
                    index === filteredStatusHistory.length - 1
                      ? "border-orange-500"
                      : "border-gray-300"
                  )}
                >
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="text-muted-foreground">
                      {formatTime(item.timestamp)}
                    </span>
                    <div className="flex items-center ml-2">
                      <span className="scale-75">{icon}</span>
                      <span className="ml-1 font-medium">{text}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              No conversation history yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
