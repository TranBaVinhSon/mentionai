import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

@Injectable()
export class LinkMetadataService {
  private readonly logger = new Logger(LinkMetadataService.name);

  async extractMetadata(url: string): Promise<LinkMetadata> {
    try {
      // Set a timeout and user agent to mimic a browser request
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        maxContentLength: 3 * 1024 * 1024, // Limit to 3MB to prevent memory issues
        maxBodyLength: 3 * 1024 * 1024, // Limit to 3MB to prevent memory issues
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
        },
      });

      const html = response.data;
      const metadata: LinkMetadata = {};

      // More robust meta tag extraction
      const metaTags = this.extractMetaTags(html);

      // Extract title with priority order
      metadata.title =
        metaTags.get("og:title") || metaTags.get("twitter:title") || this.extractTitle(html) || undefined;

      // Extract description with priority order
      metadata.description =
        metaTags.get("og:description") ||
        metaTags.get("twitter:description") ||
        metaTags.get("description") ||
        undefined;

      // Extract image with priority order
      const imageUrl =
        metaTags.get("og:image") || metaTags.get("twitter:image") || metaTags.get("twitter:image:src") || undefined;

      if (imageUrl) {
        metadata.image = this.resolveUrl(imageUrl, url);
      }

      // Extract site name
      metadata.siteName = metaTags.get("og:site_name") || metaTags.get("application-name") || new URL(url).hostname;

      // Extract favicon with better fallbacks
      metadata.favicon = this.extractFavicon(html, url);

      // Clear HTML reference to free memory immediately
      response.data = null;

      this.logger.log(`Extracted metadata for ${url}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to extract metadata for ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Extract all meta tags into a Map for easier lookup
   */
  private extractMetaTags(html: string): Map<string, string> {
    const metaTags = new Map<string, string>();

    // Match meta tags with various formats
    const metaRegex = /<meta\s+([^>]*?)>/gi;
    let match;

    while ((match = metaRegex.exec(html)) !== null) {
      const metaTag = match[1];

      // Extract property/name and content
      const propertyMatch = metaTag.match(/(?:property|name|itemprop)=["']([^"']+)["']/i);
      const contentMatch = metaTag.match(/content=["']([^"']*?)["']/i);

      if (propertyMatch && contentMatch) {
        const key = propertyMatch[1].toLowerCase();
        const value = this.cleanText(contentMatch[1]);
        if (value) {
          metaTags.set(key, value);
        }
      }
    }

    return metaTags;
  }

  /**
   * Extract title from HTML with fallbacks
   */
  private extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? this.cleanText(titleMatch[1]) : undefined;
  }

  /**
   * Extract favicon with comprehensive fallbacks
   */
  private extractFavicon(html: string, baseUrl: string): string {
    // Try various favicon link formats
    const faviconPatterns = [
      /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/i,
    ];

    for (const pattern of faviconPatterns) {
      const match = html.match(pattern);
      if (match) {
        return this.resolveUrl(match[1], baseUrl);
      }
    }

    // Fallback to standard locations
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
  }

  private cleanText(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string {
    try {
      // If already absolute URL, return as is
      if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
        return relativeUrl;
      }

      // If protocol-relative URL
      if (relativeUrl.startsWith("//")) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.protocol}${relativeUrl}`;
      }

      // If absolute path
      if (relativeUrl.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.protocol}//${urlObj.host}${relativeUrl}`;
      }

      // If relative path
      const urlObj = new URL(baseUrl);
      const pathParts = urlObj.pathname.split("/");
      pathParts.pop(); // Remove filename
      pathParts.push(relativeUrl);
      return `${urlObj.protocol}//${urlObj.host}${pathParts.join("/")}`;
    } catch (error) {
      this.logger.warn(`Failed to resolve URL ${relativeUrl} with base ${baseUrl}`);
      return relativeUrl;
    }
  }
}
