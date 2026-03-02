# Fix for 504 Gateway Timeout Retry Issue

## Problem

The application was experiencing failures when ingesting LinkedIn content to memory via the mem0ai API. The errors showed:

```
Error ingesting social content to memory for user 1:
APIError: API request failed: <html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
</body>
</html>
```

Despite having retry logic with exponential backoff (`retryWithBackoff` with 8 retries), these 504 errors were not being retried, causing data ingestion to fail permanently.

## Root Cause

The `isRetryableError()` function in `src/modules/common/utils.ts` was checking for HTTP status codes (`error.status >= 500`), but the mem0ai library was wrapping 504 Gateway Timeout errors as HTML responses in the error message string, not as HTTP status codes.

The retry logic was unable to recognize these as retryable errors because it wasn't parsing the error message content.

## Solution

Enhanced the `isRetryableError()` function to detect gateway errors in error messages by adding string-based detection:

```typescript
// Check for gateway errors in error messages (for APIs that return HTML error pages)
if (error.message) {
  const errorMessage = error.message.toLowerCase();
  if (
    errorMessage.includes("502 bad gateway") ||
    errorMessage.includes("503 service unavailable") ||
    errorMessage.includes("504 gateway time-out") ||
    errorMessage.includes("504 gateway timeout")
  ) {
    return true;
  }
}
```

This allows the retry logic to handle:
- **502 Bad Gateway** - Upstream server errors
- **503 Service Unavailable** - Temporary service outages
- **504 Gateway Time-out** - Upstream timeout errors (both hyphenated and non-hyphenated formats)

## Changes Made

**File: `src/modules/common/utils.ts`**

- Enhanced `isRetryableError()` function with gateway error message detection
- Added case-insensitive string matching for common gateway error patterns
- Covers both HTML error pages and plain text error messages

## Testing

Created and ran comprehensive tests covering:
- ✅ 504 Gateway Timeout (HTML response) - Now properly retried
- ✅ 502 Bad Gateway - Now properly retried
- ✅ 503 Service Unavailable - Now properly retried
- ✅ 500 Internal Server Error (status code) - Already working
- ✅ 429 Rate Limit - Already working
- ✅ Network timeouts - Already working
- ✅ 400 Bad Request - Correctly not retried
- ✅ 404 Not Found - Correctly not retried

All tests passed successfully.

## Impact

With this fix:
1. **Social content ingestion** will be more resilient to temporary mem0ai API timeouts
2. **LinkedIn, Twitter, and other social content** will have higher success rates during ingestion
3. **Transient gateway errors** will be automatically retried with exponential backoff
4. **Existing retry logic** (8 retries with 2000ms base delay) remains unchanged

## Retry Behavior

When a 504 Gateway Timeout occurs:
1. First attempt fails with 504 error
2. Error is now recognized as retryable
3. Retries with exponential backoff: ~2s, ~4s, ~8s, ~16s, ~32s, ~64s, ~128s, ~256s
4. Total retry window: up to ~8.5 minutes before final failure
5. Each retry has jitter added to prevent thundering herd

## Related Files

- `src/modules/common/utils.ts` - Core retry logic enhancement
- `src/modules/memory/memory.service.ts` - Uses `retryWithBackoff` for memory operations
- `src/modules/apps/apps.service.ts` - Calls memory ingestion asynchronously

## Notes

- The fix is backward compatible and doesn't affect existing error handling
- No changes to retry configuration (retries, baseDelay) were needed
- The solution handles both HTML error pages and plain text error messages
- Case-insensitive matching ensures reliability across different error formats
