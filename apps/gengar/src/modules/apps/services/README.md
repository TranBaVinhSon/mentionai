# Link Metadata Service

The `LinkMetadataService` provides enhanced metadata extraction for web links using improved HTML parsing and regex-based extraction.

## Features

### Enhanced HTML Parsing
- **Robust meta tag extraction** using Map-based lookup for better performance
- **Priority-based selection** (Open Graph → Twitter Cards → Standard meta tags)
- **Comprehensive favicon detection** with multiple fallback strategies
- **Graceful error handling** with URL hostname fallback

### Extracted Metadata
- **Title**: Page title from Open Graph, Twitter Cards, or `<title>` tag
- **Description**: Meta description from various sources
- **Image**: Preview image from Open Graph or Twitter Cards
- **Favicon**: Site icon with comprehensive fallback logic
- **Site Name**: Brand name or hostname

## Configuration

No additional configuration required. The service works out of the box with robust fallback mechanisms.

## Usage

```typescript
const metadata = await linkMetadataService.extractMetadata(url);
```

## Better Alternatives to Consider

### 1. Dedicated Libraries
Instead of regex parsing, consider these robust libraries:

```bash
# Install these for better HTML parsing
yarn add cheerio jsdom

# For JavaScript-heavy sites
yarn add puppeteer playwright
```

#### Example with Cheerio:
```typescript
import * as cheerio from 'cheerio';

private parseWithCheerio(html: string): LinkMetadata {
  const $ = cheerio.load(html);
  
  return {
    title: $('meta[property="og:title"]').attr('content') || 
           $('meta[name="twitter:title"]').attr('content') || 
           $('title').text(),
    description: $('meta[property="og:description"]').attr('content') || 
                 $('meta[name="description"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    // ... more reliable extraction
  };
}
```

### 2. Third-Party Services

#### LinkPreview.net (Currently implemented)
- ✅ Already integrated
- ✅ Handles JavaScript rendering
- ✅ 1000 free requests/month
- ❌ Requires API key
- ❌ External dependency

#### Alternatives:
- **Microlink.io**: More features, better free tier
- **URLBox**: Screenshot + metadata
- **Unfurl.js**: Self-hosted option

### 3. Browser Automation (For JavaScript-heavy sites)

```typescript
// Example with Puppeteer
async extractWithPuppeteer(url: string): Promise<LinkMetadata> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  const metadata = await page.evaluate(() => ({
    title: document.querySelector('meta[property="og:title"]')?.content ||
           document.title,
    description: document.querySelector('meta[property="og:description"]')?.content,
    // ... extract from fully rendered page
  }));
  
  await browser.close();
  return metadata;
}
```

### 4. Hybrid Approach (Recommended)

```typescript
async extractMetadata(url: string): Promise<LinkMetadata> {
  // 1. Try third-party API first (fastest, most reliable)
  if (process.env.LINK_PREVIEW_API_KEY) {
    const result = await this.tryThirdPartyAPI(url);
    if (result) return result;
  }
  
  // 2. Try Cheerio-based parsing (better than regex)
  const cheerioResult = await this.tryCheerioExtraction(url);
  if (cheerioResult) return cheerioResult;
  
  // 3. For JavaScript-heavy sites, try Puppeteer (slower but comprehensive)
  if (this.isJavaScriptHeavySite(url)) {
    const puppeteerResult = await this.tryPuppeteerExtraction(url);
    if (puppeteerResult) return puppeteerResult;
  }
  
  // 4. Final fallback to basic info
  return this.getBasicMetadata(url);
}
```

## Performance Considerations

### Current Implementation
- ⚡ **Fast regex parsing** (~100-500ms per URL)
- 🔄 **No JavaScript execution** - works with static HTML
- 📦 **Lightweight dependencies** - only uses axios
- 🎯 **High accuracy** - priority-based meta tag selection
- 🛡️ **Robust error handling** - graceful fallbacks

### Key Improvements Over Basic Parsing
1. **Map-based meta tag extraction** - faster than multiple regex calls
2. **Priority system** - selects best available source (OG → Twitter → Standard)
3. **Comprehensive favicon detection** - multiple patterns and fallbacks
4. **Better regex patterns** - handles various HTML formatting styles
5. **URL resolution** - properly handles relative URLs for images/favicons

### Caching Strategy
```typescript
// Example Redis caching
async extractMetadata(url: string): Promise<LinkMetadata> {
  // Check cache first
  const cached = await this.redis.get(`metadata:${url}`);
  if (cached) return JSON.parse(cached);
  
  // Extract metadata
  const metadata = await this.doExtraction(url);
  
  // Cache for 24 hours
  await this.redis.setex(`metadata:${url}`, 86400, JSON.stringify(metadata));
  
  return metadata;
}
```

## Testing

Test with various URL types:
- Static HTML sites
- JavaScript-heavy SPAs
- Social media links
- News websites
- Documentation sites

## Error Handling

The service includes comprehensive error handling:
- Network timeouts
- Invalid URLs
- Missing meta tags
- Server errors
- Malformed HTML

All failures gracefully fall back to basic URL information.