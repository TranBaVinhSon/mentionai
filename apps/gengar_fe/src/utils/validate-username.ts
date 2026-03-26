export function containsUrl(input: string): boolean {
  // Check for common URL patterns
  const urlPatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /\.com/i,
    /\.org/i,
    /\.net/i,
    /\.io/i,
    /linkedin\.com/i,
    /substack\.com/i,
    /\//  // Any forward slash indicates a path/URL
  ];
  
  return urlPatterns.some(pattern => pattern.test(input));
}

export function cleanUsername(input: string): string {
  // Remove common URL prefixes and suffixes
  let cleaned = input.trim();
  
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  
  // Remove www
  cleaned = cleaned.replace(/^www\./i, '');
  
  // Remove domain for LinkedIn
  cleaned = cleaned.replace(/^(.*\.)?linkedin\.com\/in\//i, '');
  cleaned = cleaned.replace(/^linkedin\.com\/in\//i, '');
  
  // Remove domain for Substack
  cleaned = cleaned.replace(/\.substack\.com.*$/i, '');
  cleaned = cleaned.replace(/^(.*\.)?substack\.com\//i, '');
  
  // Remove trailing slashes and query parameters
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/\?.*$/, '');
  
  return cleaned;
}

export function cleanTwitterUsername(input: string): string {
  // Remove common URL prefixes and suffixes for Twitter/X
  let cleaned = input.trim();
  
  // Remove @ symbol if present
  cleaned = cleaned.replace(/^@/, '');
  
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  
  // Remove www
  cleaned = cleaned.replace(/^www\./i, '');
  
  // Remove Twitter/X domain patterns
  // Matches: x.com/username, twitter.com/username, x.com/@username, twitter.com/@username
  cleaned = cleaned.replace(/^(.*\.)?(x\.com|twitter\.com)\/@?/i, '');
  
  // Remove trailing slashes and query parameters
  cleaned = cleaned.replace(/\/.*$/, '');
  cleaned = cleaned.replace(/\?.*$/, '');
  cleaned = cleaned.replace(/#.*$/, '');
  
  // Remove any remaining @ symbols
  cleaned = cleaned.replace(/@/g, '');
  
  return cleaned;
}

export function isValidTwitterHandle(handle: string): boolean {
  // Twitter handles must be 1-15 characters, alphanumeric and underscores only
  // Cannot start with a number
  const twitterHandleRegex = /^[a-zA-Z_][a-zA-Z0-9_]{0,14}$/;
  return twitterHandleRegex.test(handle);
}

export function getValidationMessage(platform: 'linkedin' | 'substack' | 'twitter'): string {
  if (platform === 'linkedin') {
    return 'Please enter only your LinkedIn username, not the full URL. For example, enter "johndoe" instead of "https://linkedin.com/in/johndoe"';
  }
  if (platform === 'twitter') {
    return 'Please enter only your X/Twitter handle, not the full URL. For example, enter "johndoe" instead of "https://x.com/johndoe"';
  }
  return 'Please enter only your Substack username, not the full URL. For example, enter "johndoe" instead of "johndoe.substack.com"';
}