# Universal Text Processor

A powerful Chrome extension that allows you to capture, process, and transform text from any website using AI. Works with customizable profiles, multiple action types, local memory storage, and webhook integration.

## 🚀 Features

### Universal Text Selection
- **Works on ANY website** - Select text anywhere and process it
- **Context menu integration** - Right-click on selected text for quick actions
- **Automatic tracking** - Extension remembers your text selections

### AI-Powered Actions
- **Rewrite for Twitter** - Convert any text into Twitter-optimized posts (280 chars)
- **Create Article** - Expand text into comprehensive articles
- **Summarize** - Create concise summaries of long content
- **Translate** - Translate to any supported language
- **Extract Insights** - Pull out key takeaways and actionable insights
- **Save to Memory** - Store text without processing for later use

### Customizable Profiles
- **Multiple Accounts** - Configure different writing profiles/personas
- **Tone & Style** - Each profile has its own tone, style, and personality
- **Target Audience** - Tailor content for specific audiences
- **Writing Guidelines** - Set specific rules and preferences per profile

### Memory & Storage
- **Local Database** - All selections and processed content saved locally
- **Status Tracking** - Mark items as pending, approved, done, or rejected
- **Full History** - Access all your captured text and generated content
- **Export Data** - Export your entire database as JSON

### Webhook Integration
- **Real-time Notifications** - Send data to external webhooks
- **Customizable Events** - Choose which actions trigger webhooks
- **Full Context** - Webhooks receive text, context, and page metadata

## 📦 Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed!

## ⚙️ Configuration

### 1. API Key Setup
1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Select text on any webpage
3. Right-click → "Process Selected Text"
4. Click the ⚙️ Settings button in the modal
5. Enter your API key (starts with `sk-or-v1-`)
6. Click "Save Settings"

### 2. Configure Writing Profiles
Edit `settings.json` to customize your writing profiles:

```json
{
  "accounts": [
    {
      "id": "your_account",
      "name": "your_account",
      "displayName": "Professional Writer",
      "enabled": true,
      "writingProfile": {
        "language": "english",
        "tone": "professional",
        "style": "informative and engaging",
        "personality": "Expert thought leader in technology",
        "targetAudience": "Business professionals and tech enthusiasts",
        "guidelines": [
          "Use clear, concise language",
          "Focus on actionable insights"
        ],
        "avoid": [
          "Excessive emojis",
          "Overly casual slang"
        ]
      }
    }
  ]
}
```

### 3. Webhook Setup (Optional)
1. Open extension settings (⚙️ button in modal)
2. Check "Enable webhook integration"
3. Enter your webhook URL
4. Click "Save Settings"

Webhooks will receive:
- Selected text
- Generated content (if processed)
- Action type (mode)
- Profile/account used
- Page context (URL, title, timestamp)

## 🎯 Usage

### Method 1: Context Menu (Recommended)
1. Select any text on any webpage
2. Right-click on the selection
3. Choose "Process Selected Text"
4. Select action, profile, and language
5. Click "Process" to generate content

### Method 2: Quick Save to Memory
1. Select text on any webpage
2. Right-click → "Save to Memory"
3. Text is saved immediately without AI processing

### Method 3: Modal Actions
Once the processing modal is open:
- **Process Button**: Generate AI content based on selected action
- **💾 Save to Memory**: Save text without processing
- **📊 Database**: View all saved entries and history
- **⚙️ Settings**: Configure API key and webhook
- **ESC Key**: Close the modal

## 📊 Database Management

Click the 📊 button to access your database:
- **View Statistics**: Total, pending, approved, done, rejected counts
- **Browse Entries**: See all saved and processed text
- **Update Status**: Mark entries as approved/done/rejected
- **Delete Entries**: Remove unwanted items
- **Export Data**: Download entire database as JSON

### Entry Types
- **💾 Memory**: Text saved without processing
- **🤖 Processed**: Text processed with AI
- **📝 Saved**: Legacy saved tweets (from Twitter mode)

## 🔧 Action Types Explained

### Rewrite for Twitter
Converts any text into a Twitter-optimized post:
- Maximum 280 characters
- Engaging and concise
- Hashtag suggestions
- Maintains key message

### Create Article
Expands text into a comprehensive article:
- Introduction section
- Detailed main points
- Conclusion and takeaways
- Well-structured paragraphs

### Summarize
Creates concise summaries:
- Key points extraction
- Main ideas highlighted
- Reduced length
- Maintains context

### Translate
Translates text to target language:
- Maintains tone and intent
- Natural language output
- Context-aware translation

### Extract Insights
Pulls out key information:
- Main takeaways
- Actionable items
- Important lessons
- Bullet-point format

### Save to Memory
Stores text without AI processing:
- Instant save
- No API call required
- Useful for later review
- Full context preserved

## 🌍 Supported Languages

Output languages available:
- 🇬🇧 English
- 🇨🇿 Czech (Čeština)
- 🇸🇰 Slovak (Slovenčina)
- 🇩🇪 German (Deutsch)
- 🇪🇸 Spanish (Español)
- 🇫🇷 French (Français)
- 🇮🇹 Italian (Italiano)
- 🇵🇱 Polish (Polski)
- 🇷🇺 Russian (Русский)
- 🇯🇵 Japanese (日本語)
- 🇨🇳 Chinese (中文)

## 🔒 Privacy & Security

- **API Key Security**: Stored locally using Chrome's secure storage API
- **Data Privacy**: All captured text stored locally on your device
- **No Tracking**: Extension does not track or collect analytics
- **Open Source**: Full code transparency and auditability
- **Optional Webhooks**: You control if/when data is sent externally
- **No Cloud Storage**: Everything stays on your device

## 📝 Webhook Payload Example

When webhook integration is enabled:

```json
{
  "event": "processText",
  "originalText": "Selected text from the webpage",
  "generatedContent": "AI-processed output based on selected action",
  "mode": "rewrite_twitter",
  "account": "your_account",
  "language": "en",
  "context": {
    "url": "https://example.com/article",
    "pageTitle": "Example Article Title",
    "timestamp": "2025-01-20T10:30:00.000Z",
    "selector": {
      "tagName": "P",
      "className": "article-text",
      "id": ""
    }
  },
  "timestamp": "2025-01-20T10:30:05.123Z",
  "source": "universal-text-processor-extension"
}
```

## 🛠️ Development

### File Structure
```
x-post-sender/
├── manifest.json          # Extension configuration
├── content.js             # Content script (runs on all pages)
├── background.js          # Background service worker
├── database.js            # Local database manager
├── settings-manager.js    # Settings and prompt builder
├── settings.json          # Configuration file
├── styles.css            # UI styles
└── README.md             # Documentation
```

### Key Components

**manifest.json**
- Extension metadata
- Permissions: activeTab, scripting, storage, contextMenus
- Host permissions: all URLs
- Content scripts injected on all pages

**content.js**
- Tracks text selections
- Shows processing modal
- Handles user interactions
- Manages UI state

**background.js**
- Service worker (Manifest V3)
- OpenRouter API integration
- Context menu management
- Webhook notifications
- Database coordination

**database.js**
- Chrome storage wrapper
- Entry management (add, update, delete)
- Statistics and reporting
- Export/import functionality

**settings-manager.js**
- Loads configuration from settings.json
- Builds AI prompts based on profiles
- Manages account/profile data

## 🐛 Troubleshooting

### Extension not working on a page
1. Reload the extension: `chrome://extensions/` → Reload button
2. Refresh the webpage
3. Check browser console for errors (F12)

### API key issues
- Verify key format starts with `sk-or-v1-`
- Check key is valid at [OpenRouter](https://openrouter.ai)
- Ensure you have API credits available
- Try re-entering the key in settings

### Text selection not being captured
- Make sure you see the text selected (highlighted)
- Try right-clicking on the selection
- Check if content script loaded (console)

### Generated content not appearing
- Check browser console for errors
- Verify API key is configured
- Check OpenRouter API status
- Ensure model is available

### Webhook not receiving data
- Verify webhook URL is correct and accessible
- Check webhook is enabled in settings
- Ensure webhook endpoint accepts POST requests
- Check webhook endpoint logs for incoming requests
- Verify webhook URL starts with `https://`

### Database not showing entries
- Click the 📊 button in the modal
- Check browser console for errors
- Try exporting database to verify data exists
- Clear browser cache and reload extension

## 🔄 Migration from X Post Manager

This extension evolved from X Post Manager (Twitter-specific) to Universal Text Processor (works everywhere). Key changes:

- ✅ Works on all websites (not just Twitter/X)
- ✅ Context menu integration
- ✅ More action types (article, summarize, extract, translate)
- ✅ Enhanced database with context tracking
- ✅ Webhook integration
- ✅ Save to memory feature

Legacy features still supported:
- Tweet processing on X/Twitter
- Multiple writing profiles
- OpenRouter API integration

## 📄 License

MIT License - Free to use and modify

## 🤝 Contributing

Contributions welcome! Feel free to:
- Submit pull requests
- Report bugs
- Suggest features
- Improve documentation

## 🔗 Resources

- [OpenRouter API](https://openrouter.ai)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**Version:** 2.0.0
**Last Updated:** January 2025
**Built with:** [Claude Code](https://claude.com/claude-code)

🎉 **Ready to use!** Select text anywhere, right-click, and start processing!
