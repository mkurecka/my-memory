# 🔧 Troubleshooting Guide

## Error: "Could not establish connection. Receiving end does not exist."

This error means the background script is trying to communicate with a tab that doesn't have the content script loaded yet.

### Quick Fix:
1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Find "Universal Text Processor"
   - Click the reload icon (🔄)

2. **Refresh the webpage**:
   - Press F5 or Ctrl+R on the page
   - Or close and reopen the tab

3. **Test on the included test page**:
   - Open `test.html` file in Chrome
   - This ensures a clean testing environment

### Why This Happens:
- Content scripts only load when pages are loaded/refreshed AFTER the extension is installed
- Some pages (chrome://, edge://, extension pages) cannot have content scripts
- The extension needs to be reloaded if code was changed

---

## Settings Button Not Working

### Symptoms:
- Click ⚙️ button but nothing happens
- No settings modal appears
- Console shows errors

### Solutions:

#### Solution 1: Check Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click the ⚙️ button
4. Look for error messages

**Expected output:**
```
[Universal Text Processor] Settings button clicked
```

**If you see an error**, check what it says and try the solutions below.

#### Solution 2: Check Modal Isn't Already Open
1. Press ESC key multiple times
2. Try clicking settings button again
3. Check if modal is hidden behind other content

#### Solution 3: Reload Extension
1. Go to `chrome://extensions/`
2. Click reload on "Universal Text Processor"
3. Refresh your webpage
4. Try again

#### Solution 4: Check Content Script Loaded
1. Open console (F12)
2. Look for this message:
   ```
   [Universal Text Processor] Content script loaded on: [URL]
   [Universal Text Processor] Settings loaded successfully
   ```
3. If not present, the content script didn't load
4. Reload extension + refresh page

---

## Context Menu Not Appearing

### Symptoms:
- Right-click on selected text
- No "Process Selected Text" option
- No "Save to Memory" option

### Solutions:

#### Solution 1: Verify Text is Selected
- Make sure text is highlighted (blue background)
- Try selecting text with mouse drag
- Don't just click - must drag to select

#### Solution 2: Check Extension is Enabled
1. Go to `chrome://extensions/`
2. Find "Universal Text Processor"
3. Verify toggle is ON (blue)
4. If OFF, turn it on

#### Solution 3: Test on Different Page
Some pages don't allow extensions:
- ❌ chrome:// pages (extension pages, settings)
- ❌ edge:// pages
- ❌ Chrome Web Store
- ❌ Some secure banking sites

✅ **Try the included test.html file**

#### Solution 4: Reinstall Context Menu
1. Go to `chrome://extensions/`
2. Remove "Universal Text Processor"
3. Reload unpacked extension
4. Context menus are recreated on install

---

## Modal Opens But Settings Don't Save

### Symptoms:
- Enter API key
- Click "Save Settings"
- Nothing happens or error appears

### Solutions:

#### Solution 1: Check API Key Format
- Must start with: `sk-or-v1-`
- No spaces before or after
- Copy-paste directly from OpenRouter

#### Solution 2: Check Storage Permission
1. Go to `chrome://extensions/`
2. Click "Details" on "Universal Text Processor"
3. Scroll to "Permissions"
4. Verify "Storage" is listed
5. If not, manifest.json is wrong

#### Solution 3: Clear Extension Storage
```javascript
// Run in console on any page:
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
});
```
Then try saving again.

---

## API Key Saved But Generation Fails

### Symptoms:
- API key saved successfully
- Click "Process" button
- Shows "Processing with AI..."
- Never completes or shows error

### Solutions:

#### Solution 1: Check API Key is Valid
1. Go to [openrouter.ai](https://openrouter.ai)
2. Log in
3. Go to Keys section
4. Verify key is active
5. Check expiration date

#### Solution 2: Check Credits
1. Go to [openrouter.ai/credits](https://openrouter.ai/credits)
2. Verify you have credits
3. Add credits if needed ($5 minimum)

#### Solution 3: Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Click "Process" button
4. Look for request to `openrouter.ai`
5. Check response:
   - 200 = Success
   - 401 = Invalid API key
   - 402 = No credits
   - 429 = Rate limited

#### Solution 4: Check Console for Errors
Look for messages like:
```
[Universal Text Processor] Error calling OpenRouter: [error message]
```

Common errors:
- `Invalid API key` → Re-enter key
- `Insufficient credits` → Add credits
- `Network error` → Check internet connection
- `CORS error` → Should not happen (using background script)

---

## Database Not Showing Entries

### Symptoms:
- Click 📊 button
- Database opens but shows "No entries yet"
- You know you saved/processed text

### Solutions:

#### Solution 1: Check Storage
```javascript
// Run in console:
chrome.storage.local.get(['xpost_database'], (result) => {
  console.log('Database:', result);
});
```

#### Solution 2: Try Saving Something New
1. Select text
2. Right-click → "Save to Memory"
3. Open database
4. Should see new entry

#### Solution 3: Export and Check
1. Open database
2. Click "📥 Export"
3. Open the JSON file
4. Check if data is there

---

## Webhook Not Receiving Data

### Symptoms:
- Webhook enabled in settings
- Process text successfully
- Webhook endpoint doesn't receive data

### Solutions:

#### Solution 1: Verify Webhook URL
- Must be valid HTTPS URL
- Must be accessible from your computer
- Test with curl:
  ```bash
  curl -X POST https://your-webhook-url.com \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```

#### Solution 2: Check Webhook Logs
- Look at your webhook service logs
- Check if request arrived
- Check request format

#### Solution 3: Check Console
Look for webhook-related messages:
```
Webhook sent successfully for processText: 200
```

Or errors:
```
Webhook failed for processText: [status] [error]
```

#### Solution 4: Test Webhook Directly
1. Open background.js
2. Find `sendWebhookNotification` function
3. Add console.log to see what's being sent

---

## Extension Not Working on Specific Sites

### Symptoms:
- Works on some sites
- Doesn't work on others
- No errors in console

### Explanation:
Some sites are protected and don't allow extensions:

**Cannot inject on:**
- chrome:// pages
- edge:// pages
- Chrome Web Store
- Some banking sites
- Some enterprise sites with CSP

**Should work on:**
- Regular websites
- Your own local HTML files
- Most content sites

### Solution:
✅ **Use the test.html file** for testing
✅ Test on regular websites like GitHub, Wikipedia, etc.

---

## Modal Styling Issues

### Symptoms:
- Modal appears but looks broken
- Buttons overlap
- Text unreadable

### Solutions:

#### Solution 1: Check CSS Loaded
1. Open DevTools (F12)
2. Go to Sources tab
3. Find styles.css in the extension
4. Verify it loaded

#### Solution 2: Check for CSS Conflicts
- Some sites override extension styles
- Press F12 → Elements
- Inspect the modal
- Check computed styles

#### Solution 3: Force Reload Extension
1. Remove extension
2. Clear browser cache
3. Reinstall extension
4. Test again

---

## General Debugging Steps

### Step 1: Check Console
**Always start here!**
```
F12 → Console tab
```

Look for:
- ✅ `[Universal Text Processor]` logs
- ❌ Red error messages
- ⚠️ Yellow warnings

### Step 2: Check Extension Status
```
chrome://extensions/
```

Verify:
- ✅ Extension is enabled
- ✅ No errors shown
- ✅ Correct version (2.0.0)

### Step 3: Check Network
```
F12 → Network tab
```

Look for:
- Requests to openrouter.ai
- Requests to your webhook
- Failed requests (red)

### Step 4: Check Storage
```javascript
// In console:
chrome.storage.local.get(null, (data) => {
  console.log('All stored data:', data);
});
```

### Step 5: Test in Incognito
- Open incognito window
- Load extension in incognito (check box in chrome://extensions/)
- Test there
- Rules out conflicts with other extensions

---

## Complete Reset Procedure

If nothing else works:

### Step 1: Backup Data (Optional)
```javascript
// In console:
chrome.storage.local.get(['xpost_database'], (result) => {
  const json = JSON.stringify(result, null, 2);
  console.log('Copy this and save:', json);
});
```

### Step 2: Remove Extension
1. Go to `chrome://extensions/`
2. Click "Remove" on Universal Text Processor
3. Confirm removal

### Step 3: Clear Extension Data
```javascript
// In console on any page:
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
});
```

### Step 4: Restart Browser
- Close ALL Chrome windows
- Reopen Chrome

### Step 5: Reinstall Extension
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select extension folder
5. Verify it loads without errors

### Step 6: Test on test.html
- Open the included test.html file
- Follow test instructions
- Verify each feature works

---

## Getting More Help

### Useful Information to Provide:

When reporting issues, include:
1. **Browser & Version**: Chrome 120, Edge 119, etc.
2. **Operating System**: Windows 11, macOS 14, Ubuntu 22.04
3. **Extension Version**: Check manifest.json
4. **Console Output**: Copy all relevant logs
5. **Steps to Reproduce**: Exact steps that cause the issue
6. **What You Expected**: What should happen
7. **What Actually Happened**: What went wrong

### Console Logs to Capture:
```
[Universal Text Processor] Content script loaded on: ...
[Universal Text Processor] Settings loaded successfully
[Universal Text Processor] Opening modal with text: ...
[Universal Text Processor] API key status: ...
[Universal Text Processor] Settings button clicked
```

### Network Tab Info:
- URL called
- Status code
- Response data
- Error messages

---

## Quick Reference: Common Fixes

| Problem | Quick Fix |
|---------|-----------|
| Context menu missing | Reload extension + refresh page |
| Settings not saving | Check API key format (sk-or-v1-...) |
| Modal not opening | Check console for errors |
| Generation fails | Verify API key & credits |
| Connection error | Reload extension + refresh page |
| Button doesn't work | Press ESC, reload page, try again |
| Webhook not working | Verify URL with curl test |
| Database empty | Try saving something new |

---

**Still having issues?** Open the console (F12) and look for red error messages. They usually tell you exactly what's wrong!
