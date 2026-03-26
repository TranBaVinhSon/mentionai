import { useCopyToClipboard } from "@/hooks/use-copy";
import {
  CheckCircle as CheckmarkCircle01Icon,
  Copy as Copy01Icon,
  Trash2 as Delete02Icon,
  RotateCcw as RefreshIcon,
} from "lucide-react";

export const ChatActions = ({ content = "" }: { content: string }) => {
  const [copiedText, copy] = useCopyToClipboard();

  return (
    <div className="flex opacity-100 transition-opacity ease-in-out duration-250 justify-end gap-4 flex-row items-center">
      <button onClick={() => copy(content)}>
        {copiedText ? (
          <CheckmarkCircle01Icon size={14} className="text-green-400" />
        ) : (
          <Copy01Icon size={14} className="text-foreground/40" />
        )}
      </button>
      {/* <button>
        <RefreshIcon size={14} className="text-foreground/40" />
      </button>
      <button>
        <Delete02Icon size={14} className="text-red-400" />
      </button> */}
    </div>
  );
};
