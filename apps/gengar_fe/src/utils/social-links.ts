import { SocialNetworkType } from "@/services/api";

export function getSocialMediaLink(
  source: SocialNetworkType,
  type: string,
  externalId: string,
  metadata?: any
): string {
  switch (source.toLowerCase()) {
    case "facebook":
      // For posts: https://www.facebook.com/[postId]
      return `https://www.facebook.com/${externalId}`;

    case "twitter":
    case "x":
      // If externalId is already a full URL, return it as is (but update to x.com)
      if (externalId.startsWith("http")) {
        return externalId.replace("twitter.com", "x.com");
      }
      // For profiles, just return the profile URL
      if (type === "profile") {
        return `https://x.com/${externalId.replace('@', '')}`;
      }
      // For tweets, if it's just an ID, we can't construct a proper URL without username
      // This fallback should rarely be used since backend stores full URLs
      return `https://x.com/search?q=${externalId}`;  // Fallback to search

    case "linkedin":
      // For posts: externalId already contains the full LinkedIn URL from Apify
      return externalId.startsWith("http") ? externalId : `https://www.linkedin.com/feed/update/${externalId}`;

    case "instagram":
      // For posts: https://www.instagram.com/p/[postId]
      return `https://www.instagram.com/p/${externalId}`;

    case "medium":
      // For Medium, externalId should be the full URL to the article
      return externalId.startsWith("http") ? externalId : "#";

    case "substack":
      // For Substack, externalId should be the full URL to the article
      return externalId.startsWith("http") ? externalId : "#";

    case "github":
      // For GitHub profiles and repositories
      if (type === "profile") {
        return `https://github.com/${externalId}`;
      } else if (type === "repository") {
        // Try to use full_name from metadata to construct proper URL
        if (metadata?.full_name) {
          return `https://github.com/${metadata.full_name}`;
        }
        // Fallback to search if no full_name available
        return `https://github.com/search?q=id:${externalId}&type=repositories`;
      }
      return "#";

    default:
      return "#";
  }
}
