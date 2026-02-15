import hljs from "highlight.js";
import { useEffect, useRef } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle as CheckmarkCircle01Icon, Copy as Copy01Icon, Check as Tick01Icon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy";

export type codeBlockProps = {
  lang?: string;
  code?: string;
  showHeader?: boolean;
};

export const CodeBlock = ({
  lang,
  code,
  showHeader = true,
}: codeBlockProps) => {
  const ref = useRef<HTMLElement>(null);
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const [copiedText, copy] = useCopyToClipboard();

  useEffect(() => {
    if (ref?.current && code) {
      const highlightedCode = hljs.highlight(language, code).value;
      ref.current.innerHTML = highlightedCode;
    }
  }, [code, language]);

  return (
    <div
      className={cn(
        "w-full flex-shrink-0 bg-muted dark:bg-muted/70 overflow-hidden rounded-lg border border-border"
      )}
    >
      {showHeader && (
        <div className="flex w-full items-center justify-between border-b border-border py-2.5 pl-2 pr-2 ">
          <p className="px-2 text-sm text-foreground/40">{language}</p>
          <button onClick={() => copy(code || "")}>
            {copiedText ? (
              <CheckmarkCircle01Icon className="text-green-500" size={18} />
            ) : (
              <Copy01Icon size={18} className="text-foreground/40" />
            )}
          </button>
        </div>
      )}
      <pre className="w-full px-3 pt-4 pb-2">
        <code
          className={`hljs font-mono text-sm language-${language} inline-block w-full overflow-x-auto whitespace-pre-wrap tracking-wide`}
          ref={ref}
        ></code>
      </pre>
    </div>
  );
};
