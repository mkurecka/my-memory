# 📊 Comprehensive Request/Response Logging

## Overview

Every OpenRouter API request is now fully logged to the browser console with complete details for debugging, monitoring, and optimization.

## What Gets Logged

### 📤 REQUEST LOGGING

Every API call logs:

1. **Request Details**
   - Endpoint URL
   - Model name
   - Processing mode
   - Image mode flag
   - Timestamp (ISO format)

2. **Full Prompt**
   - Complete prompt text sent to AI
   - Includes all template replacements
   - Shows profile-specific instructions
   - Action-specific enhancements

3. **Parameters**
   - Account/Profile ID
   - Output language
   - Action parameters (JSON formatted)
   - Webhook flag
   - Additional comments/instructions

4. **Image Data** (when applicable)
   - Image format (data URL type)
   - Size in characters
   - Estimated size in KB
   - Base64 preview (first 100 chars)

5. **Request Body**
   - Full JSON structure
   - Model specification
   - Message array
   - Content (text + image URL)
   - ⚠️ Note: Image data truncated in logs for readability

### 📥 RESPONSE LOGGING

Every API response logs:

1. **Response Details**
   - HTTP status code
   - Status text (OK, etc.)
   - Timestamp (ISO format)

2. **Token Usage**
   - Prompt tokens consumed
   - Completion tokens generated
   - Total tokens used
   - 💡 Use this to monitor costs!

3. **Model Information**
   - Actual model used by API
   - May differ from requested model (fallbacks)

4. **Full Response**
   - Complete JSON response
   - Structured and formatted
   - All metadata included

5. **Generated Content**
   - Full AI-generated text
   - Content length in characters
   - Easy to copy from console

### ❌ ERROR LOGGING

When errors occur:

1. **API Errors**
   - HTTP status code
   - Error message from API
   - Full error body
   - Timestamp

2. **Validation Errors**
   - Response structure issues
   - Missing content
   - Unexpected formats

## Console Output Format

### Example: Text Processing Request

```
================================================================================
[OpenRouter Request] Starting API call
================================================================================
📤 REQUEST DETAILS:
  • Endpoint: https://openrouter.ai/api/v1/chat/completions
  • Model: openai/gpt-4o-mini
  • Mode: rewrite_twitter
  • Is Image: false
  • Timestamp: 2025-01-20T14:23:45.678Z

📝 FULL PROMPT:
Rewrite the following text as a Twitter/X post matching this writing profile:

Tone: professional
Style: informative and engaging
Personality: Expert thought leader in technology and business
Target Audience: Business professionals and tech enthusiasts
Voice: semi-formal formality, subtle and witty humor, measured and authentic enthusiasm

Guidelines:
- Use clear, concise language
- Focus on actionable insights
- Maintain professional but approachable tone
- Include relevant hashtags sparingly

Avoid:
- Excessive emojis
- Overly casual slang
- Controversial political statements

Keep it concise and within Twitter's character limit (280 characters).

Original text:

"This is a test tweet about AI technology..."

⚙️ PARAMETERS:
  • Account: michalku_com
  • Language: en
  • Action Params: {
  "account": "michalku_com"
}
  • Send Webhook: true
  • Comment: (none)

📦 REQUEST BODY:
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Rewrite the following text as a Twitter/X post..."
    }
  ]
}
================================================================================
```

### Example: Image Processing Request

```
================================================================================
[OpenRouter Request] Starting API call
================================================================================
📤 REQUEST DETAILS:
  • Endpoint: https://openrouter.ai/api/v1/chat/completions
  • Model: google/gemini-2.0-flash-001
  • Mode: describe_image
  • Is Image: true
  • Timestamp: 2025-01-20T14:25:12.345Z

📝 FULL PROMPT:
Analyze this image in detail and create a comprehensive prompt that could be used to recreate it. Include:

1. Main subject and composition
2. Visual style, mood, and atmosphere
3. Colors, lighting, and shadows
4. Technical details (angle, perspective, depth of field)
5. Artistic style or medium
6. Any text or notable elements

Provide the analysis and then a final recreation prompt that starts with 'RECREATION PROMPT:'

🖼️ IMAGE DATA:
  • Format: data:image/jpeg;base64,/9j/4...
  • Size: 234567 characters
  • Estimated KB: 229 KB

📦 REQUEST BODY:
{
  "model": "google/gemini-2.0-flash-001",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Analyze this image in detail..."
        },
        {
          "type": "image_url",
          "imageUrl": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...[base64 data truncated]"
          }
        }
      ]
    }
  ]
}
================================================================================
```

### Example: Successful Response

```
================================================================================
✅ [OpenRouter Response] SUCCESS
================================================================================
📥 RESPONSE DETAILS:
  • Status: 200 OK
  • Timestamp: 2025-01-20T14:23:47.890Z

📊 TOKEN USAGE:
  • Prompt tokens: 245
  • Completion tokens: 87
  • Total tokens: 332

🤖 MODEL INFO:
  • Model used: openai/gpt-4o-mini

📦 FULL RESPONSE:
{
  "id": "gen-xyz123",
  "model": "openai/gpt-4o-mini",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "AI technology is transforming..."
      },
      "finish_reason": "stop",
      "index": 0
    }
  ],
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 87,
    "total_tokens": 332
  }
}

✨ GENERATED CONTENT:
AI technology is transforming businesses faster than ever. Here's what you need to know about the latest developments and their impact on your industry. #AI #Technology #Business

📏 CONTENT LENGTH: 156 characters
================================================================================
```

### Example: Error Response

```
================================================================================
❌ [OpenRouter Response] API ERROR
================================================================================
  • Status: 400 Bad Request
  • Error Body: {"error":{"message":"Invalid model specified","code":"invalid_request"}}
  • Timestamp: 2025-01-20T14:30:15.123Z
================================================================================
```

## How to Access Logs

### Chrome DevTools
1. **Right-click** on the page
2. Select **"Inspect"**
3. Click **"Console"** tab
4. Look for logs with `[OpenRouter Request]` prefix

### Filter Logs
```javascript
// In console, filter by:
[OpenRouter Request]  // All requests
[OpenRouter Response] // All responses
❌                    // Errors only
✅                    // Success only
```

### Copy Logs
- Click on any log entry
- Right-click → "Copy object" (for JSON data)
- Or select text and Ctrl+C/Cmd+C

## Use Cases

### 1. **Debugging**
- See exact prompt sent to AI
- Verify parameters are correct
- Check image data is included
- Identify API errors

### 2. **Cost Monitoring**
- Track token usage per request
- Calculate API costs
- Optimize prompts for efficiency
- Monitor daily/weekly usage

### 3. **Prompt Engineering**
- See how templates are built
- Understand profile replacements
- Test different parameters
- Refine prompt structure

### 4. **Performance Analysis**
- Compare response times
- Track model performance
- Identify slow requests
- Optimize API calls

### 5. **Error Diagnosis**
- Detailed error messages
- Full context for issues
- API error codes
- Request/response correlation

## Privacy & Security

### What's Safe to Log:
✅ Prompts and parameters (helpful for debugging)
✅ Token usage (for monitoring)
✅ Model names and settings
✅ Generated content
✅ Error messages

### What's Truncated:
⚠️ Image base64 data (only first 100 chars + size)
⚠️ API keys (never logged - redacted in headers)

### What's Never Logged:
❌ Full API key
❌ Sensitive user credentials
❌ Private user data (beyond what's in the request)

## Tips

### Enable Verbose Logging
Console is already verbose. To reduce noise:
```javascript
// Filter in DevTools Console:
/OpenRouter/  // Show only OpenRouter logs
```

### Export Logs
```javascript
// In console:
copy(console)  // Copy all logs to clipboard
```

### Save Requests
Useful for:
- Bug reports
- Feature requests
- Cost analysis
- Prompt optimization

### Monitor Costs
```javascript
// Track tokens from logs:
// Prompt: 245 tokens
// Completion: 87 tokens
// Total: 332 tokens
// Cost: ~$0.0008 (for gpt-4o-mini)
```

## Log Levels

### Always Logged:
- Request start
- Request parameters
- Full prompt
- Response status
- Generated content

### On Success:
- Token usage
- Model info
- Full response JSON

### On Error:
- HTTP status code
- Error message
- Full error body
- Stack trace (if available)

## Examples

### Cost Calculation
From logs:
```
Total tokens: 332
Model: gpt-4o-mini ($0.00025 per 1K tokens)
Cost: 332 * $0.00025 / 1000 = $0.000083
```

### Performance Tracking
```
Request time: 14:23:45.678Z
Response time: 14:23:47.890Z
Duration: ~2.2 seconds
```

### Prompt Optimization
Compare token usage:
```
Long prompt: 500 tokens → $0.00125
Short prompt: 200 tokens → $0.0005
Savings: 60% reduction
```

## Troubleshooting

### No Logs Appearing?
1. Check Console tab is open
2. Clear filters in DevTools
3. Ensure extension is active
4. Reload the page

### Logs Too Verbose?
- Use Console filters
- Clear old logs regularly
- Focus on specific request types

### Need Historical Data?
- Console logs are session-only
- Copy important logs immediately
- Consider external logging service

---

**Version:** 2.2.0
**Status:** ✅ Fully Implemented
**Location:** background.js (lines ~220-360)
