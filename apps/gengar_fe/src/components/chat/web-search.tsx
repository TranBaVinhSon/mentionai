/* eslint-disable @next/next/no-img-element */
import { Book as Book02Icon } from "lucide-react";
import { MyTooltip } from "../ui/tooltip";
import useScreenSize from "@/hooks/use-screen";

type WebSearchResultItem = {
  title: string;
  url: string;
  content: string;
  host?: string;
  favicon?: string;
};

type WebSearchResult = {
  query?: string;
  results: WebSearchResultItem[];
};

export function WebSearch({ result }: { result: WebSearchResult | null }) {
  const { width } = useScreenSize();

  if (!result || result.results.length === 0) {
    return null;
  }

  return (
    <div className="my-6 max-w-full" style={{ maxWidth: width - 32 }}>
      <div className="space-y-4 not-prose">
        <div>
          <div className="flex flex-row">
            <span className="flex w-auto flex-row">
              <Book02Icon size={14} className="mr-2" />
              <span className="text-xs font-medium underline-offset-4 underline decoration-wavy">
                Web Search
              </span>
            </span>
          </div>
          <div className="flex flex-row gap-2 scroll-none justify-start items-stretch no-scrollbar my-4 w-full overflow-x-auto">
            {result.results.map((r) => (
              <MyTooltip
                key={r.url}
                side="top"
                contentClassName="max-w-[200px]"
                content={r.content}
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col line-clamp-1 gap-2 justify-between items-start min-w-[200px] cursor-pointer rounded-md border border-border bg-muted/60 p-2.5 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center">
                    {(() => {
                      const fallbackHost = (() => {
                        try {
                          return new URL(r.url).hostname.replace(/^www\./, "");
                        } catch {
                          return undefined;
                        }
                      })();

                      const host = (r.host || fallbackHost || r.url).replace(
                        /^www\./,
                        ""
                      );
                      const favicon =
                        r.favicon ||
                        (fallbackHost
                          ? `https://www.google.com/s2/favicons?domain=${fallbackHost}`
                          : undefined);

                      return (
                        <>
                          {favicon ? (
                            <img
                              src={favicon}
                              alt="favicon"
                              className="mr-2 h-4 w-4"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                          <div className="text-sm">{host}</div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-foreground/40 font-normal line-clamp-2">
                    {r.title}
                  </p>
                </a>
              </MyTooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
