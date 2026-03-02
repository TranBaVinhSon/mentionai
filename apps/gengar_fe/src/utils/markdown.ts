/**
 * Utility function to detect if content contains HTML syntax
 * @param content - The text content to check
 * @returns boolean - true if content appears to contain HTML
 */
export function isHtmlContent(content: string): boolean {
  if (!content || typeof content !== "string") {
    return false;
  }

  // Common HTML patterns to check for
  const htmlPatterns = [
    // HTML tags
    /<[^>]+>/,
    // Common HTML entities
    /&[a-zA-Z0-9#]+;/,
  ];

  // Check if any HTML pattern is found
  return htmlPatterns.some((pattern) => pattern.test(content));
}

/**
 * Utility function to detect if content contains markdown syntax
 * @param content - The text content to check
 * @returns boolean - true if content appears to contain markdown
 */
export function isMarkdownContent(content: string): boolean {
  if (!content || typeof content !== "string") {
    return false;
  }

  // Don't treat as markdown if it's HTML content
  if (isHtmlContent(content)) {
    return false;
  }

  // Common markdown patterns to check for
  const markdownPatterns = [
    // Headers
    /^#{1,6}\s+/m,
    // Bold/italic
    /\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_/,
    // Links
    /\[([^\]]+)\]\(([^)]+)\)/,
    // Code blocks
    /```[\s\S]*?```|`[^`]+`/,
    // Lists
    /^[\s]*[-*+]\s+/m,
    /^[\s]*\d+\.\s+/m,
    // Blockquotes
    /^>\s+/m,
    // Line breaks (double space or backslash at end of line)
    /  $/m,
    /\\$/m,
    // Horizontal rules
    /^[\s]*[-*_]{3,}[\s]*$/m,
    // Tables
    /\|.*\|/,
    // Strikethrough
    /~~[^~]+~~/,
  ];

  // Check if any markdown pattern is found
  return markdownPatterns.some((pattern) => pattern.test(content));
}

/**
 * Utility function to clean up content for display
 * @param content - The text content to clean
 * @returns string - cleaned content
 */
export function cleanContent(content: string): string {
  if (!content) return "";

  // Basic cleanup - trim whitespace and normalize line breaks
  return content.trim().replace(/\r\n/g, "\n");
}
