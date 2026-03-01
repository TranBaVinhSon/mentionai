import * as React from "react";

interface LinkSourceProps {
  links: Array<{
    link: string;
    title?: string;
    metadata?: {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
    } | null;
  }>;
  className?: string;
  maxWidth?: number;
}

export function LinkSource({
  links,
  className = "",
  maxWidth = 200,
}: LinkSourceProps) {
  const handleFaviconError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Fallback to generic link icon if favicon fails to load
    e.currentTarget.style.display = "none";
    const fallbackIcon = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallbackIcon) {
      fallbackIcon.classList.remove("hidden");
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Hide the image if it fails to load
    e.currentTarget.style.display = "none";
  };

  const getDisplayTitle = (link: string, title?: string, metadata?: any) => {
    if (metadata?.title) return metadata.title;
    if (title) return title;
    try {
      return new URL(link).host;
    } catch {
      return link;
    }
  };

  const getHostname = (link: string) => {
    try {
      return new URL(link).host;
    } catch {
      return link;
    }
  };

  const getFaviconUrl = (link: string, metadata?: any) => {
    if (metadata?.favicon) return metadata.favicon;
    return `https://www.google.com/s2/favicons?domain=${getHostname(link)}`;
  };

  // Sort links with rich preview first
  const sortedLinks = [...links].sort((a, b) => {
    const aHasMetadata =
      a.metadata &&
      (a.metadata.title || a.metadata.description || a.metadata.image);
    const bHasMetadata =
      b.metadata &&
      (b.metadata.title || b.metadata.description || b.metadata.image);

    if (aHasMetadata && !bHasMetadata) return -1;
    if (!aHasMetadata && bHasMetadata) return 1;
    return 0;
  });

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 ${className}`}
    >
      {sortedLinks.map((linkData, i) => {
        const hasMetadata =
          linkData.metadata &&
          (linkData.metadata.title ||
            linkData.metadata.description ||
            linkData.metadata.image);

        return (
          <a
            key={i}
            href={linkData.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block bg-background border rounded-lg hover:border-primary/50 transition-colors overflow-hidden ${
              hasMetadata ? "h-auto" : "h-14 md:h-16"
            }`}
          >
            {/* Rich preview with metadata */}
            {hasMetadata ? (
              <div className="h-full">
                {/* Image section */}
                {linkData.metadata?.image && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={linkData.metadata.image}
                      alt={linkData.metadata.title || "Link preview"}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  </div>
                )}

                {/* Content section */}
                <div className="p-2 md:p-3">
                  <div className="mb-1 md:mb-2">
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm font-medium mb-1 line-clamp-2">
                        {getDisplayTitle(
                          linkData.link,
                          linkData.title,
                          linkData.metadata
                        )}
                      </div>
                      {linkData.metadata?.description && (
                        <div className="text-xs text-muted-foreground mb-1 md:mb-2 line-clamp-2">
                          {linkData.metadata.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <img
                          src={getFaviconUrl(linkData.link, linkData.metadata)}
                          alt="favicon"
                          className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0"
                          onError={handleFaviconError}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-primary flex-shrink-0 hidden"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <div className="text-xs text-muted-foreground truncate">
                          {linkData.metadata?.siteName ||
                            getHostname(linkData.link)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Simple link without metadata */
              <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 h-full">
                <img
                  src={getFaviconUrl(linkData.link)}
                  alt="favicon"
                  className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0"
                  onError={handleFaviconError}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary flex-shrink-0 hidden"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="text-xs md:text-sm font-medium truncate">
                    {getDisplayTitle(linkData.link, linkData.title)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {getHostname(linkData.link)}
                  </div>
                </div>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
