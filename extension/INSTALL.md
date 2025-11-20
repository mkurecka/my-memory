# Installation Guide - Universal Text Processor

## 🚀 5-Minute Setup

### Step 1: Install Extension (1 minute)

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in your address bar
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Look for toggle in top-right corner
   - Click to enable (it will turn blue)

3. **Load the Extension**
   - Click "Load unpacked" button (top-left)
   - Navigate to this folder (`x-post-sender`)
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "Universal Text Processor" in your extensions list
   - Version 2.0.0
   - Status: Enabled ✅

### Step 2: Get API Key (2 minutes)

1. **Visit OpenRouter**
   - Go to [openrouter.ai/keys](https://openrouter.ai/keys)
   - Sign in or create account

2. **Generate API Key**
   - Click "Create Key" or similar button
   - Copy the generated key (starts with `sk-or-v1-`)
   - **Important**: Save this key somewhere safe!

3. **Add Credits (if needed)**
   - Go to [openrouter.ai/credits](https://openrouter.ai/credits)
   - Add some credits to your account ($5 goes a long way)

### Step 3: Configure Extension (2 minutes)

1. **Open Any Webpage**
   - Navigate to any website (try this page!)

2. **Select Some Text**
   - Highlight any text on the page

3. **Open Processing Modal**
   - Right-click on the selected text
   - Click "Process Selected Text" in context menu

4. **Enter API Key**
   - Click the ⚙️ Settings button (bottom-right)
   - Paste your API key in the input field
   - Click "Save Settings"

5. **Test It!**
   - The modal should refresh
   - You'll see "Generate" button is now enabled
   - Try generating some content!

### Step 4: Optional - Configure Webhook (Optional)

**Skip this if you don't need webhook integration**

1. **Get Webhook URL**
   - From your webhook service (e.g., Pipedream, Zapier, custom server)
   - Example: `https://eowk5jk9mfplhsm.m.pipedream.net`

2. **Configure in Settings**
   - Open Settings (⚙️ button)
   - Check "Enable webhook integration"
   - Paste webhook URL
   - Click "Save Settings"

## ✅ Verify Installation

### Test 1: Text Selection
1. Select text anywhere
2. Right-click
3. You should see:
   - "Process Selected Text"
   - "Save to Memory"

✅ **Pass**: Context menu items appear
❌ **Fail**: Reload extension and refresh page

### Test 2: Modal Opens
1. Select text
2. Right-click → "Process Selected Text"
3. Modal should appear with:
   - Selected text preview
   - Action options
   - Profile selection
   - Language dropdown

✅ **Pass**: Modal appears correctly
❌ **Fail**: Check console for errors (F12)

### Test 3: API Key Works
1. Open modal (with text selected)
2. Choose "Rewrite for Twitter"
3. Click "Process"
4. Wait a few seconds
5. Generated content should appear

✅ **Pass**: Content generated successfully
❌ **Fail**: Check API key, credits, and console

### Test 4: Database Works
1. Open modal
2. Click 📊 Database button
3. Database viewer should open
4. Should show any saved entries

✅ **Pass**: Database opens
❌ **Fail**: Check console for storage errors

### Test 5: Memory Save
1. Select text
2. Right-click → "Save to Memory"
3. Open database (📊)
4. Should see entry with type "💾 Memory"

✅ **Pass**: Entry appears in database
❌ **Fail**: Check console and storage permissions

## 🔧 Troubleshooting

### Extension Not Loading
```
Error: "Cannot load extension"
```
**Fix:**
- Ensure you selected the correct folder
- Check that `manifest.json` exists in the folder
- Try disabling/re-enabling developer mode

### API Key Not Saving
```
Error: "Failed to save settings"
```
**Fix:**
- Check chrome.storage permission in manifest
- Try clearing extension data and re-entering key
- Check browser console for specific error

### Context Menu Not Appearing
```
Problem: Right-click doesn't show extension options
```
**Fix:**
1. Reload extension: chrome://extensions/ → Reload button
2. Refresh the webpage
3. Check that text is actually selected (highlighted)
4. Try on a different website

### Modal Not Opening
```
Problem: Context menu works but modal doesn't open
```
**Fix:**
1. Check browser console (F12) for JavaScript errors
2. Verify content.js loaded: Console → check for "App settings loaded"
3. Reload extension and page

### Generated Content Not Appearing
```
Problem: "Processing with AI..." but nothing happens
```
**Fix:**
1. **Check API Key**:
   - Is it correct format? (starts with `sk-or-v1-`)
   - Is it entered correctly?
   - Re-enter in settings

2. **Check Credits**:
   - Visit [openrouter.ai](https://openrouter.ai)
   - Verify you have credits

3. **Check Network**:
   - Open DevTools → Network tab
   - Look for failed requests to openrouter.ai
   - Check error message

4. **Check Console**:
   - Open DevTools → Console tab
   - Look for error messages
   - Share in issue if needed

### Webhook Not Working
```
Problem: Webhook enabled but not receiving data
```
**Fix:**
1. Test webhook URL with curl:
   ```bash
   curl -X POST https://your-webhook-url.com \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. Check webhook service logs

3. Verify URL is correct in settings

4. Check browser console for webhook errors

## 📋 Requirements

### Browser
- Chrome 88+
- Edge 88+
- Brave 1.20+
- Any Chromium-based browser

### Operating System
- Windows 10+
- macOS 10.13+
- Linux (any recent distro)

### Internet
- Active internet connection
- Access to openrouter.ai
- Access to your webhook service (if used)

### Permissions Required
When you load the extension, it will request:
- ✅ **activeTab**: To interact with the current page
- ✅ **scripting**: To inject content scripts
- ✅ **storage**: To save settings and database
- ✅ **contextMenus**: To add right-click options
- ✅ **Access to all websites**: To work universally

All permissions are necessary for core functionality.

## 🎯 First Actions After Install

### 1. Try the Quick Test
Select this text and process it:

> "Chrome extensions are powerful tools that enhance browser functionality. They can modify web pages, add new features, and integrate with external services."

**Action**: Right-click → Process Selected Text → Rewrite for Twitter

### 2. Save Something to Memory
Find an interesting quote or fact on any website and save it:

**Action**: Select text → Right-click → Save to Memory

### 3. View Your Database
Check what you've saved:

**Action**: Select text → Right-click → Process Selected Text → Click 📊

### 4. Customize Your Profile
Edit `settings.json` to match your writing style:
- Change tone, style, personality
- Add your guidelines
- Set your target audience

### 5. Test All Action Types
Try each action on the same text to see the difference:
- Rewrite for Twitter
- Create Article
- Summarize
- Extract Insights

## 📚 Next Steps

After installation:

1. **Read the README.md** - Comprehensive feature overview
2. **Check USAGE_GUIDE.md** - Common use cases and workflows
3. **Customize settings.json** - Make it your own
4. **Start using it daily** - Build your workflow

## 🆘 Getting Help

### Check Documentation
- README.md - Full documentation
- USAGE_GUIDE.md - How-to guides
- TRANSFORMATION_SUMMARY.md - What changed

### Check Console
Most issues have clear error messages in:
- Browser Console (F12 → Console tab)

### Common Error Messages

| Error | Solution |
|-------|----------|
| "API key not configured" | Enter key in settings |
| "Invalid API key format" | Key must start with sk-or-v1- |
| "Failed to fetch" | Check internet, OpenRouter status |
| "Quota exceeded" | Add credits to OpenRouter account |
| "No text selected" | Ensure text is highlighted |

## ✅ Installation Complete!

If all tests passed, you're ready to go! 🎉

**Try it now**: Select any text, right-click, and choose "Process Selected Text"

---

**Need Help?** Check the troubleshooting section above or open an issue on GitHub.
