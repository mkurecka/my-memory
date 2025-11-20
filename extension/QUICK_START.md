# 🚀 Quick Start - Universal Text Processor

## ✅ Current Status
Your extension is **working correctly**! The "fallback" messages you see are **normal** and indicate the extension is saving data even when full context isn't available.

## 📋 What You Need to Know

### Console Messages (Normal Behavior)

✅ **Good Messages:**
```
Settings and database loaded successfully
[Universal Text Processor] Content script loaded on: [URL]
[Universal Text Processor] Saved to memory: [text]
[Universal Text Processor] Saved to memory (basic context): [text]
```

⚠️ **Expected on Some Pages:**
```
Could not establish connection. Receiving end does not exist.
```
This is **normal** - it means the page doesn't allow full extension access, but data is still saved!

❌ **Bad Messages (Need fixing):**
```
API key not configured
Invalid API key format
Failed to fetch from OpenRouter
```

## 🎯 How to Use

### Option 1: Process Text with AI
1. **Select text** on any website
2. **Right-click** → "Process Selected Text"
3. **Choose action**:
   - Rewrite for Twitter (280 chars)
   - Create Article
   - Summarize
   - Translate
   - Extract Insights
4. **Select profile** (michalku_com or aicko_cz)
5. **Click "Process"**
6. **Copy result** (📋 button)

### Option 2: Quick Save (No AI)
1. **Select text** on any website
2. **Right-click** → "Save to Memory"
3. ✅ Done! Text saved instantly

## 🌐 Webhook Status

**Configured**: ✅ Yes
**URL**: `https://primary-production-3ce13.up.railway.app/webhook/post-scraper`

**Sends data when**:
- ✅ Text is processed with AI
- ✅ Text is saved to memory
- ✅ Tweet is saved (legacy)

**Payload format**:
```json
{
  "event": "processText",
  "originalText": "your selected text",
  "generatedContent": "AI output",
  "mode": "rewrite_twitter",
  "account": "michalku_com",
  "language": "cs",
  "context": {
    "url": "https://...",
    "pageTitle": "...",
    "timestamp": "2025-..."
  },
  "timestamp": "2025-...",
  "source": "universal-text-processor-extension"
}
```

## ⚙️ Setup API Key (First Time)

1. Get key from: [openrouter.ai/keys](https://openrouter.ai/keys)
2. Select any text → Right-click → "Process Selected Text"
3. Click ⚙️ Settings button
4. Paste your API key (starts with `sk-or-v1-`)
5. Click "Save Settings"

## 📊 View Your Database

1. Select any text
2. Right-click → "Process Selected Text"
3. Click 📊 Database button
4. See all saved entries
5. Export with 📥 Export button

## 🔍 Understanding "Fallback" Mode

**What it means**:
- Content script couldn't load on that page
- Extension still works - saves with basic info
- You still get: URL, page title, timestamp, text

**What's missing**:
- Detailed element info (tag name, class, id)

**Impact**: Minimal - everything still works!

## 🚦 Page Compatibility

### ✅ Works Everywhere
- Regular websites (news, blogs, GitHub, etc.)
- Your own HTML files
- test.html (included with extension)
- Social media sites

### ⚠️ Limited Access (Fallback Mode)
- Some secure sites
- Sites with strict CSP
- **Still saves data**, just with basic context

### ❌ Cannot Work On
- chrome:// pages (browser internal pages)
- edge:// pages
- Chrome Web Store
- Extension pages

## 🎨 Your Profiles

### michalku_com
- **Tone**: Professional
- **Style**: Informative and engaging
- **Best for**: Business content, tech articles

### aicko_cz
- **Tone**: Creative and inspiring
- **Style**: Storytelling
- **Best for**: Creative content, social media

## 🛠️ If Something Goes Wrong

### Settings Button Not Working?
1. Press **F12** (open console)
2. Click ⚙️ button
3. Look for: `[Universal Text Processor] Settings button clicked`
4. If you see error, share it!

### Modal Not Opening?
1. Make sure text is **selected** (highlighted)
2. **Reload extension**: chrome://extensions/ → 🔄
3. **Refresh page**: F5
4. Try again

### API Generation Fails?
1. Check API key is correct
2. Verify you have credits on OpenRouter
3. Check console for specific error

## 📝 Common Workflows

### Workflow 1: Blog Post → Tweet
```
1. Find article paragraph
2. Select text
3. Right-click → "Process Selected Text"
4. Choose "Rewrite for Twitter"
5. Select profile
6. Click "Process"
7. Copy tweet (📋)
8. Paste to Twitter
```

### Workflow 2: Research Collection
```
1. Select interesting quote
2. Right-click → "Save to Memory"
3. Repeat for multiple sources
4. Click 📊 to review all
5. Export when done (📥)
```

### Workflow 3: Content Creation
```
1. Collect 5-10 text snippets
2. Open database (📊)
3. Review saved content
4. Select combined text
5. Process → "Create Article"
6. Get full article
```

## ✨ Tips

1. **Use keyboard**: Select text → Right-click is fastest
2. **Profiles matter**: Try both profiles to see different outputs
3. **Save first, process later**: Use "Save to Memory" to collect, process in bulk
4. **Check database**: 📊 button shows everything you've saved
5. **Export regularly**: Back up your database weekly

## 🎯 What Works Right Now

- ✅ Text selection tracking
- ✅ Context menu (right-click)
- ✅ Save to memory (instant)
- ✅ Process with AI (6 action types)
- ✅ Database storage
- ✅ Webhook integration
- ✅ Settings management
- ✅ Multi-language support
- ✅ Multiple profiles

## 🔄 After Updating Code

Always:
1. **Reload extension**: chrome://extensions/ → 🔄
2. **Refresh pages**: F5 on all open tabs
3. **Test on test.html**: Verify it works

## 📞 Quick Checks

**Is it working?**
- Open console (F12)
- Look for `[Universal Text Processor]` logs
- Should see green/blue messages, not red errors

**Is webhook working?**
- Process some text
- Check your webhook service logs
- Look for POST requests

**Is database working?**
- Save something
- Open database (📊)
- Should see the entry

---

## 🎉 You're All Set!

Everything is working as expected. The "fallback" messages are **normal** - they mean the extension is robust and handles different page types gracefully.

**Try it now**: Select this text and process it! 🚀
