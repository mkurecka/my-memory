# 🤖 Model Configuration Settings

## Overview

Configure which AI models to use for text processing and image analysis directly from the extension settings UI.

## ✨ New Features

### Settings UI Updates

The extension settings modal now includes:

1. **Text Processing Model** - Configure the model for all text-based actions
2. **Image Analysis Model** - Configure the model for image description

## 🎯 How to Access

### Open Settings:
1. Select any text on a webpage
2. Right-click → "Process Selected Text"
3. Click the **⚙️** settings button in the modal
4. Or click **⚙️** button in FAB menu

### Settings Modal Shows:
```
⚙️ Extension Settings

┌─────────────────────────────────────────┐
│ OpenRouter API Key:                     │
│ [sk-or-v1-...]                          │
├─────────────────────────────────────────┤
│ AI Model Configuration:                 │
│                                         │
│ Text Processing Model:                  │
│ [openai/gpt-4o-mini]                    │
│                                         │
│ Image Analysis Model:                   │
│ [google/gemini-2.0-flash-001]           │
├─────────────────────────────────────────┤
│ Webhook Configuration:                  │
│ ☑ Enable webhook integration           │
│ [https://your-webhook.com]              │
└─────────────────────────────────────────┘
```

## 📝 Configuration Options

### Text Processing Model

**What it controls:**
- Rewrite for Twitter
- Create Article
- Summarize
- Translate
- Extract Insights
- All text-based actions

**Default:** `openai/gpt-4o-mini`

**Popular Options:**
```
openai/gpt-4o-mini          - Fast, affordable, GPT-4 quality
openai/gpt-4o               - Most capable GPT-4 model
anthropic/claude-3.5-sonnet - Excellent for creative writing
anthropic/claude-3-opus     - Most capable Claude model
google/gemini-pro           - Google's advanced model
google/gemini-flash         - Fast and efficient
meta-llama/llama-3-70b      - Open source, powerful
```

### Image Analysis Model

**What it controls:**
- Image description
- Recreation prompt generation
- Visual analysis

**Default:** `google/gemini-2.0-flash-001`

**Popular Options:**
```
google/gemini-2.0-flash-001    - Fast, accurate vision (recommended)
google/gemini-pro-vision       - Advanced vision capabilities
openai/gpt-4o                  - GPT-4 with vision
anthropic/claude-3.5-sonnet    - Claude with vision
```

## 🔧 How It Works

### Storage

Settings are saved in two places:

1. **Chrome Local Storage** (persistent)
   ```javascript
   chrome.storage.local.set({
     contentModel: 'openai/gpt-4o-mini',
     imageModel: 'google/gemini-2.0-flash-001'
   });
   ```

2. **In-Memory Settings** (runtime)
   ```javascript
   settingsManager.settings.api.model = 'openai/gpt-4o-mini';
   settingsManager.settings.modes.describe_image.model = 'google/gemini-2.0-flash-001';
   ```

### Loading Sequence

```
Extension Loads
  ↓
Load settings.json (defaults)
  ↓
Load chrome.storage (user preferences)
  ↓
Override defaults with saved models
  ↓
Ready for use
```

### Saving Process

```
User clicks "Save Settings"
  ↓
Validate inputs
  ↓
Save to chrome.storage.local
  ↓
Update in-memory settings
  ↓
Log confirmation
  ↓
Close settings modal
```

## 💡 Usage Examples

### Example 1: Switch to Claude for Creative Writing

**Scenario:** You want better creative writing for articles

**Steps:**
1. Open settings (⚙️)
2. Change Text Processing Model to: `anthropic/claude-3.5-sonnet`
3. Keep Image Model as: `google/gemini-2.0-flash-001`
4. Click "Save Settings"

**Result:** All text actions now use Claude 3.5 Sonnet

### Example 2: Use GPT-4o for Everything

**Scenario:** You want maximum quality for both text and images

**Steps:**
1. Open settings (⚙️)
2. Text Processing Model: `openai/gpt-4o`
3. Image Analysis Model: `openai/gpt-4o`
4. Click "Save Settings"

**Result:** Both text and image actions use GPT-4o

### Example 3: Budget-Conscious Setup

**Scenario:** Minimize API costs while maintaining quality

**Steps:**
1. Open settings (⚙️)
2. Text Processing Model: `openai/gpt-4o-mini`
3. Image Analysis Model: `google/gemini-2.0-flash-001`
4. Click "Save Settings"

**Result:** Fast, affordable processing for both types

## 📊 Model Comparison

### Text Models

| Model | Speed | Cost | Quality | Best For |
|-------|-------|------|---------|----------|
| gpt-4o-mini | ⚡⚡⚡ | $ | ⭐⭐⭐⭐ | General use |
| gpt-4o | ⚡⚡ | $$$ | ⭐⭐⭐⭐⭐ | Complex tasks |
| claude-3.5-sonnet | ⚡⚡ | $$ | ⭐⭐⭐⭐⭐ | Creative writing |
| gemini-pro | ⚡⚡⚡ | $$ | ⭐⭐⭐⭐ | Fast responses |

### Vision Models

| Model | Speed | Cost | Quality | Best For |
|-------|-------|------|---------|----------|
| gemini-2.0-flash-001 | ⚡⚡⚡ | $ | ⭐⭐⭐⭐ | General images |
| gemini-pro-vision | ⚡⚡ | $$ | ⭐⭐⭐⭐⭐ | Detailed analysis |
| gpt-4o | ⚡⚡ | $$$ | ⭐⭐⭐⭐⭐ | Complex images |
| claude-3.5-sonnet | ⚡⚡ | $$ | ⭐⭐⭐⭐ | Artistic analysis |

## 🔍 Finding Model IDs

### OpenRouter Models

Visit: https://openrouter.ai/models

Format: `provider/model-name`

Examples:
- `openai/gpt-4o-mini`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-2.0-flash-001`
- `meta-llama/llama-3-70b-instruct`

### Model Categories

**General Purpose:**
- `openai/gpt-4o-mini` - Best balance
- `anthropic/claude-3.5-sonnet` - Creative tasks
- `google/gemini-pro` - Fast responses

**Vision Capable:**
- `google/gemini-2.0-flash-001` - Fast vision
- `openai/gpt-4o` - Advanced vision
- `anthropic/claude-3.5-sonnet` - Artistic vision

**Cost-Effective:**
- `openai/gpt-4o-mini` - Cheap, good quality
- `google/gemini-flash` - Very fast, cheap
- `meta-llama/llama-3-70b` - Open source

## ⚙️ Technical Details

### Data Structure

```javascript
// Chrome Storage
{
  contentModel: "openai/gpt-4o-mini",
  imageModel: "google/gemini-2.0-flash-001"
}

// Settings Manager (runtime)
settingsManager.settings = {
  api: {
    model: "openai/gpt-4o-mini"  // Used for text
  },
  modes: {
    describe_image: {
      model: "google/gemini-2.0-flash-001"  // Used for images
    }
  }
}
```

### API Request

The selected model is used in each request:

```javascript
// Text processing
{
  model: settingsManager.settings.api.model,
  messages: [...]
}

// Image processing
{
  model: settingsManager.settings.modes.describe_image.model,
  messages: [...]
}
```

### Console Logging

When processing, you'll see:

```
[OpenRouter Request] Starting API call
================================================================================
📤 REQUEST DETAILS:
  • Model: openai/gpt-4o-mini (or your configured model)
  ...

Settings saved successfully: {
  hasApiKey: true,
  contentModel: "openai/gpt-4o-mini",
  imageModel: "google/gemini-2.0-flash-001",
  webhook: true
}
```

## 🛡️ Validation

### Model Name Format

Valid formats:
✅ `provider/model-name`
✅ `openai/gpt-4o-mini`
✅ `anthropic/claude-3.5-sonnet:beta`

Invalid formats:
❌ Empty string
❌ Just model name without provider
❌ Special characters (except `/`, `-`, `.`, `:`)

### Required Fields

- Both models are **required**
- Cannot save without specifying both
- Shows error if either is empty

## 🔄 Migration from settings.json

### Before (Static Config)

```json
// settings.json
{
  "api": {
    "model": "openai/gpt-4o-mini"
  },
  "modes": {
    "describe_image": {
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

**Issues:**
- Requires editing JSON file
- Need to reload extension
- Not user-friendly

### After (Dynamic Config)

```javascript
// Settings UI → chrome.storage
contentModel: "openai/gpt-4o-mini"
imageModel: "google/gemini-2.0-flash-001"
```

**Benefits:**
✅ Easy to change via UI
✅ No file editing needed
✅ Instant updates
✅ User-friendly

## 🎓 Best Practices

### 1. Start with Defaults
Use the recommended defaults first:
- Text: `openai/gpt-4o-mini`
- Image: `google/gemini-2.0-flash-001`

### 2. Test Changes
After changing models:
- Process some text
- Analyze an image
- Check quality
- Monitor costs

### 3. Match Models to Tasks

**For creative writing:**
- `anthropic/claude-3.5-sonnet`

**For technical content:**
- `openai/gpt-4o-mini`

**For speed:**
- `google/gemini-flash`

**For complex images:**
- `google/gemini-pro-vision` or `openai/gpt-4o`

### 4. Monitor Costs

Check OpenRouter dashboard:
- Track token usage
- Monitor spend
- Optimize model selection

## 🚨 Troubleshooting

### Models Not Saving

**Issue:** Settings don't persist
**Solution:** Check browser console for errors, ensure chrome.storage permissions

### Invalid Model Name

**Issue:** "Model not found" error
**Solution:** Verify model ID at openrouter.ai/models

### No Response

**Issue:** Processing hangs
**Solution:** Check API key, verify model is available, check OpenRouter status

## 📚 Resources

- **OpenRouter Models:** https://openrouter.ai/models
- **OpenRouter Docs:** https://openrouter.ai/docs
- **Pricing:** https://openrouter.ai/models (shows per-model costs)
- **API Keys:** https://openrouter.ai/keys

---

**Version:** 2.2.0
**Status:** ✅ Fully Implemented
**Location:** Settings UI (⚙️ button)
