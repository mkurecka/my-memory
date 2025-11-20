# Image URL Extraction & Debugging

## Issue

When sending CDN-proxied images (like Substack CDN URLs), the vision model might receive a different image than expected due to:
1. CDN transformation parameters
2. URL encoding issues
3. Cached/proxied versions of images

### Example Problem URL:
```
https://substackcdn.com/image/fetch/$s_!6hwF!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
```

This is a Substack CDN proxy URL that includes:
- Transformation parameters: `$s_!6hwF!,f_auto,q_auto:good,fl_progressive:steep`
- Encoded actual URL: `https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F...`

## Solution

### 1. Extract Actual Image URLs from CDN Proxies

Added logic to detect and extract the actual underlying image URL from CDN proxies:

```javascript
// content.js - processText function
if (imageData.includes('substackcdn.com/image/fetch/')) {
  // Extract the actual URL from Substack CDN format
  const match = imageData.match(/https:\/\/substackcdn\.com\/image\/fetch\/[^/]+\/(https?%3A%2F%2F[^?]+)/);
  if (match && match[1]) {
    const actualUrl = decodeURIComponent(match[1]);
    console.log('[Universal Text Processor] Extracted actual URL from Substack CDN:', actualUrl);
    console.log('[Universal Text Processor] Original CDN URL:', imageData);
    imageData = actualUrl;
  }
}
```

This extracts:
```
Original: https://substackcdn.com/image/fetch/$s_!6hwF!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png

Extracted: https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
```

### 2. Enhanced Debugging Logs

Added comprehensive logging in both `content.js` and `background.js`:

**content.js:**
```javascript
console.log('[Universal Text Processor] Final image URL being sent:', imageData);
```

**background.js:**
```javascript
if (isImageMode && imageData) {
  console.log("\n🖼️ IMAGE DATA:");
  console.log("  • Image URL:", imageData);
  console.log("  • Full URL (for debugging):", imageData);
  console.log("  • Format:", isBase64 ? 'Base64 Data URL' : 'Direct URL');
  console.log("  • URL length:", imageData.length, "characters");
  console.log("  • URL protocol:", new URL(imageData).protocol);
  console.log("  • URL host:", new URL(imageData).hostname);
  console.log("  • URL pathname:", new URL(imageData).pathname);
}
```

## How to Debug Image Issues

### Step 1: Open Browser Console
1. Right-click on the page
2. Select "Inspect" or "Inspect Element"
3. Click the "Console" tab

### Step 2: Process an Image
1. Click on the image you want to analyze
2. Click the FAB "Process" button
3. Select "Describe Image"
4. Click "Process"

### Step 3: Check Console Logs

Look for these log entries:

#### In content.js (if CDN URL detected):
```
[Universal Text Processor] Extracted actual URL from Substack CDN: https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
[Universal Text Processor] Original CDN URL: https://substackcdn.com/image/fetch/...
```

#### In content.js (final URL):
```
[Universal Text Processor] Final image URL being sent: https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
```

#### In background.js (full details):
```
================================================================================
[OpenRouter Request] Starting API call
================================================================================
📤 REQUEST DETAILS:
  • Endpoint: https://openrouter.ai/api/v1/chat/completions
  • Model: google/gemini-2.0-flash-001
  • Mode: describe_image
  • Is Image: true

🖼️ IMAGE DATA:
  • Image URL: https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
  • Full URL (for debugging): https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
  • Format: Direct URL
  • URL length: 138 characters
  • URL protocol: https:
  • URL host: substack-post-media.s3.amazonaws.com
  • URL pathname: /public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
```

### Step 4: Verify the Image

Copy the logged URL and paste it in a new browser tab to verify it's the correct image:
```
https://substack-post-media.s3.amazonaws.com/public/images/f9f18cc7-9074-44c9-8cf8-5a127a401bda_4000x1708.png
```

If the image that opens is NOT what you expected, then:
1. The webpage is using a different image source than you think
2. The CDN might be serving cached/transformed versions
3. The page might have multiple images and you clicked the wrong one

## Common CDN Patterns

### Substack CDN
**Pattern:**
```
https://substackcdn.com/image/fetch/[parameters]/[encoded_url]
```

**Extraction:**
- Match the pattern
- Extract the encoded URL part
- URL decode it
- Use the actual S3 URL

### Cloudinary (future support)
**Pattern:**
```
https://res.cloudinary.com/[cloud]/image/upload/[transforms]/[image_id]
```

**Note:** Currently not extracted, uses CDN URL as-is

### Imgix (future support)
**Pattern:**
```
https://[domain].imgix.net/[path]?[params]
```

**Note:** Currently not extracted, uses CDN URL as-is

## Troubleshooting

### Issue: AI describes wrong image

**Possible causes:**
1. **CDN is caching a different image**
   - Solution: Use the actual S3 URL (now automatic for Substack)
   - Verify: Check console logs for "Extracted actual URL"

2. **Page has multiple overlapping images**
   - Solution: Click carefully on the specific image
   - Verify: Check the image preview in the modal

3. **Lazy-loaded placeholder image**
   - Solution: Scroll to the image first, let it load fully
   - Verify: Inspect the `src` attribute in DevTools

4. **Image has data-src instead of src**
   - Solution: This is a limitation, image must be fully loaded
   - Verify: Check if image has `loading="lazy"` attribute

### Issue: URL extraction not working

**Check:**
1. Console shows "Extracted actual URL" message
2. If not, the URL pattern might be different
3. Copy the full URL from console and examine the format

**Fix:**
Add a new extraction pattern in content.js:
```javascript
if (imageData.includes('your-cdn.com')) {
  // Add custom extraction logic
  const match = imageData.match(/your-pattern/);
  if (match) {
    imageData = decodeURIComponent(match[1]);
  }
}
```

## Benefits

1. **Direct Access** - Vision model gets the actual image, not a transformed/cached version
2. **Debugging** - Full URL details logged for troubleshooting
3. **Reliability** - Bypasses CDN transformation issues
4. **Transparency** - You can verify exactly what URL is being sent

## Testing

To test the fix:

1. **Test with Substack image:**
   ```
   https://substackcdn.com/image/fetch/...
   ```
   - Should extract and use S3 URL
   - Check console for extraction logs

2. **Test with direct S3 URL:**
   ```
   https://substack-post-media.s3.amazonaws.com/public/images/...
   ```
   - Should use URL as-is
   - No extraction needed

3. **Test with other CDNs:**
   - Currently uses URL as-is
   - May need additional extraction logic

---

**Version:** 2.2.2
**Date:** 2025-01-20
**Status:** ✅ Implemented and Logging
