# Custom Prompt Templates

## Overview

Users can now customize the AI prompts for each action mode directly from the extension settings UI. Custom prompts override the defaults from `settings.json`, allowing personalized AI behavior for each action type.

## Features

### Editable Prompts in Settings

The settings modal now includes textarea fields for customizing prompts for:

1. **Rewrite for Twitter** - Customize how text is rewritten for Twitter/X
2. **Create Article** - Control article generation style
3. **Summarize** - Adjust summarization approach
4. **Translate** - Modify translation instructions
5. **Extract Insights** - Change insight extraction format
6. **Describe Image** - Customize image analysis prompts

### Default Behavior

- **Empty fields** = Uses default prompts from `settings.json`
- **Custom prompts** = Override defaults with your own instructions
- Shows placeholder with first 100 characters of default prompt

## How It Works

### 1. Storage Architecture

```javascript
// Default prompts (from settings.json)
{
  "modes": {
    "rewrite_twitter": {
      "promptTemplate": "Rewrite the following text as a Twitter/X post..."
    },
    "article": {
      "promptTemplate": "Create a comprehensive article..."
    }
    // ... more modes
  }
}

// Custom prompts (in chrome.storage.local)
{
  "customPrompts": {
    "rewrite_twitter": "Custom Twitter rewrite prompt...",
    "article": "",  // Empty = use default
    "summarize": "Custom summary prompt..."
  }
}
```

### 2. Prompt Resolution Flow

```
User clicks "Process"
  ↓
Load customPrompts from chrome.storage
  ↓
For each mode:
  - If customPrompts[mode] exists and not empty → use custom
  - Otherwise → use default from settings.json
  ↓
Apply profile placeholders ({tone}, {style}, etc.)
  ↓
Add action-specific parameters
  ↓
Send to AI model
```

### 3. Settings Manager (Async)

`buildPrompt()` is now async to load custom prompts:

```javascript
async buildPrompt(mode, accountId, tweetText, additionalContext = '', languageCode = null, actionParams = {}) {
  // Load custom prompts from storage
  const customPrompts = await new Promise((resolve) => {
    chrome.storage.local.get(['customPrompts'], (result) => {
      resolve(result.customPrompts || {});
    });
  });

  // Use custom if available, otherwise default
  let prompt = customPrompts[mode] || modeConfig.promptTemplate;

  // Apply placeholders and parameters
  // ...

  return prompt;
}
```

## Usage

### Accessing Custom Prompts

1. Click **FAB menu** (bottom-left floating button)
2. Click **Settings** (⚙️ icon in FAB menu)
3. Scroll to **"Prompt Templates"** section
4. Edit any prompt you want to customize
5. Leave empty to use defaults
6. Click **"Save Settings"**

### Settings Modal UI

```
⚙️ Extension Settings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prompt Templates:
Customize prompts for each action. Leave empty to use defaults.

Rewrite for Twitter Prompt:
┌─────────────────────────────────────────┐
│ [Your custom prompt here]               │
│                                         │
└─────────────────────────────────────────┘
  Default: Rewrite the following text as a...

Create Article Prompt:
┌─────────────────────────────────────────┐
│                                         │
└─────────────────────────────────────────┘
  Default: Create a comprehensive article...

[... more prompts ...]
```

## Example Custom Prompts

### 1. Twitter - More Casual Style

**Default:**
```
Rewrite the following text as a Twitter/X post matching this writing profile:

Tone: {tone}
Style: {style}
...
```

**Custom:**
```
Rewrite this as a super casual, friendly tweet. Use emojis, keep it under 280 characters, and make it sound like a conversation with a friend. Don't be too formal or corporate.
```

### 2. Article - Technical Focus

**Default:**
```
Create a comprehensive article based on this text matching this writing profile:
...
```

**Custom:**
```
Write a detailed technical article with:
- Clear section headers
- Code examples where relevant
- Step-by-step instructions
- Troubleshooting tips
- Real-world use cases

Target audience: Developers and technical professionals
Tone: Professional but approachable
```

### 3. Summarize - Executive Style

**Default:**
```
Summarize the following text in a clear and concise manner:
...
```

**Custom:**
```
Create an executive summary with:
1. Key takeaway in one sentence
2. Three main points (bullet points)
3. Action items (if any)
4. Impact/importance

Format: Business executive style, focus on decisions and outcomes.
```

### 4. Image Description - Art Focus

**Default:**
```
Analyze this image in detail and create a comprehensive prompt...
```

**Custom:**
```
Analyze this image from an artistic perspective:
- Art style and movement
- Color palette and symbolism
- Composition and visual flow
- Emotional impact
- Historical or cultural context
- Artistic techniques used

Then create a prompt for AI image generators that captures the artistic essence.
```

## Placeholder Variables

Custom prompts can still use placeholder variables from account profiles:

- `{tone}` - Writing tone from profile
- `{style}` - Writing style from profile
- `{personality}` - Personality description
- `{targetAudience}` - Target audience
- `{formality}` - Formality level
- `{humor}` - Humor style
- `{enthusiasm}` - Enthusiasm level
- `{guidelines}` - Writing guidelines (bullet list)
- `{avoid}` - Things to avoid (bullet list)

**Example with placeholders:**
```
Create a {style} article for {targetAudience}.

Tone: {tone}
Formality: {formality}

Guidelines:
{guidelines}

Avoid:
{avoid}
```

## Technical Details

### Files Modified

1. **content.js**
   - Added prompt textareas to settings modal
   - Collect and save custom prompts
   - Load saved prompts on settings open

2. **background.js**
   - Save `customPrompts` to chrome.storage
   - Updated `buildPrompt()` call to await (now async)

3. **settings-manager.js**
   - Made `buildPrompt()` async
   - Load custom prompts from storage
   - Use custom if available, fallback to default

### Storage Structure

```javascript
// chrome.storage.local
{
  "openrouterApiKey": "sk-or-v1-...",
  "contentModel": "openai/gpt-4o-mini",
  "imageModel": "google/gemini-2.0-flash-001",
  "customPrompts": {
    "rewrite_twitter": "Custom prompt...",
    "article": "",
    "summarize": "Another custom prompt...",
    "translate": "",
    "extract_insights": "",
    "describe_image": "Custom image analysis..."
  },
  "webhook": {
    "enabled": true,
    "url": "https://..."
  }
}
```

## Reset to Defaults

To reset a prompt to default:
1. Open Settings
2. Clear the textarea for that prompt (make it empty)
3. Click "Save Settings"

The extension will use the default from `settings.json` when the custom prompt is empty.

## Best Practices

### 1. Start Simple
Begin with small modifications to default prompts rather than completely rewriting them.

### 2. Test Incrementally
Change one prompt at a time and test before modifying others.

### 3. Use Placeholders
Leverage profile placeholders like `{tone}` and `{style}` for consistency across accounts.

### 4. Document Your Changes
Keep notes on what custom prompts you're using and why they work better.

### 5. Consider Context
Different prompts work better for different:
- Content types (technical vs. creative)
- Target audiences (developers vs. general public)
- Platforms (Twitter vs. blog articles)

## Troubleshooting

### Issue: Prompts not saving

**Solution:**
- Check browser console for errors
- Verify chrome.storage permissions
- Try reloading the extension

### Issue: Still using old prompts

**Solution:**
- Reload the page after saving settings
- Check if custom prompt field has actual content
- Verify prompt wasn't accidentally cleared

### Issue: Placeholders not working

**Solution:**
- Make sure account profile has those fields defined
- Check spelling of placeholder (case-sensitive)
- Verify you're using the correct account

## Future Enhancements

Potential additions:
- [ ] Import/export custom prompt sets
- [ ] Prompt templates library
- [ ] A/B testing different prompts
- [ ] Prompt versioning
- [ ] Preview prompt with placeholders filled
- [ ] Prompt effectiveness analytics

---

**Version:** 2.3.0
**Date:** 2025-01-20
**Status:** ✅ Implemented and Working
