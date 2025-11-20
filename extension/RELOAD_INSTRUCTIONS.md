# Extension Reload Instructions

## Current Status

**Extension ID**: `epjggaaoglehneiflbfpkfghikblkjom`
**Service Worker**: Inactive (Neaktivní)

## How to Activate

### Option 1: Quick Reload

1. Go to `chrome://extensions/`
2. Find "Universal Text Processor"
3. Click the **reload icon** (🔄) on the extension card
4. Check if service worker becomes active

### Option 2: Full Reload

1. Go to `chrome://extensions/`
2. Click **Remove** on the extension
3. Click **Load unpacked**
4. Select: `/Users/michalkurecka/PhpstormProjects/universal-text-processor/extension`
5. Extension should load with new configuration

### Option 3: Trigger Service Worker

1. Right-click on any webpage
2. Select "Process Selected Text" from context menu
3. This should activate the service worker

## Verify Activation

After reload, check:

1. **Service Worker Status**
   - Go to `chrome://extensions/`
   - Click "service worker" link
   - Should show as "Active"

2. **Console Output**
   - In service worker console, you should see:
   ```
   [API Client] Initialized with base URL: https://text-processor-api.kureckamichal.workers.dev
   Settings and database loaded successfully
   ```

3. **Test Functionality**
   - Select text on any page
   - Right-click → "Process Selected Text"
   - Modal should appear

## Troubleshooting

### Service Worker Won't Activate

**Try:**
```javascript
// In service worker console
chrome.runtime.reload()
```

### Errors in Console

**Check:**
- `settings.json` is valid JSON
- All imported scripts exist (`api-client.js`, `settings-manager.js`, `database.js`)
- No syntax errors in scripts

### Context Menu Missing

**Fix:**
1. Reload extension completely
2. Check background.js loaded successfully
3. Verify manifest permissions include `contextMenus`

## Testing Checklist

After activation:

- [ ] Service worker shows "Active"
- [ ] Console shows initialization messages
- [ ] Context menu appears on right-click
- [ ] No errors in console
- [ ] API client initialized successfully

## Backend Connection Test

Once active, test backend connection:

```javascript
// In service worker console
apiClient.sendWebhook('test', {
  message: 'Testing from extension',
  extensionId: chrome.runtime.id
})
```

Expected response: Webhook delivers to backend successfully

## Next Steps

1. ✅ Reload extension
2. ✅ Verify service worker active
3. ✅ Check console for initialization
4. ✅ Test context menu
5. ✅ Test backend connection

---

**Extension Path**: `/Users/michalkurecka/PhpstormProjects/universal-text-processor/extension`
**Backend URL**: `https://text-processor-api.kureckamichal.workers.dev`
