# Testing Guide - Universal Text Processor

## Overview

This guide covers testing the integration between the browser extension and the Cloudflare Workers backend.

## Backend Status

✅ **Backend Deployed**: `https://text-processor-api.kureckamichal.workers.dev`

**Resources Created:**
- D1 Database: `text-processor-db` (ID: b70b21ae-9fa2-4464-b3fd-9d4eeea7548a)
- KV Cache: `CACHE` (ID: b52a33acf7114a3e842d575b830b980e)
- KV Sessions: `SESSIONS` (ID: 7d68ad4ef5c14fe1aaaa981c50c15597)
- R2 Bucket: `text-processor-storage`

**Performance:**
- Startup Time: 14ms
- Bundle Size: 151.56 KiB (32.10 KiB gzipped)

## Extension Setup

### 1. Load the Extension

1. Open Chrome/Edge browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `/extension` directory
6. Extension should appear with version 2.2.0

### 2. Verify Extension Loaded

Check browser console (F12) for:
```
[API Client] Initialized with base URL: https://text-processor-api.kureckamichal.workers.dev
Settings and database loaded successfully
```

## Testing Checklist

### Phase 1: Basic Connectivity

- [ ] **Extension Loads**: No errors in browser console
- [ ] **API Client Initializes**: See initialization message
- [ ] **Context Menu Appears**: Right-click → "Process Selected Text"

### Phase 2: Backend Connectivity

Test backend endpoints directly:

```bash
# Health check
curl https://text-processor-api.kureckamichal.workers.dev/

# API version
curl https://text-processor-api.kureckamichal.workers.dev/api/v1/
```

Expected responses:
- Root: Welcome message or redirect
- API: JSON response with API info

### Phase 3: Extension Features

#### Test 1: Text Selection
1. Go to any webpage (or use `extension/test.html`)
2. Select some text
3. Right-click → "Process Selected Text"
4. Modal should open with selected text

**Expected:**
- ✅ Modal appears
- ✅ Selected text is populated
- ✅ Account selector shows accounts
- ✅ Mode selector shows processing modes

#### Test 2: Save to Memory
1. Select text on webpage
2. Right-click → "Save to Memory"
3. Check browser console

**Expected:**
- ✅ Console shows memory save attempt
- ⚠️ May show auth error if no API key (expected for now)

#### Test 3: Webhook Testing
1. Open extension settings (`extension/settings.json`)
2. Verify webhook URL: `https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook`
3. Trigger an event (process text, save memory)
4. Check backend logs:
   ```bash
   cd backend
   npm run tail
   ```

**Expected:**
- ✅ Webhook receives POST request
- ✅ Backend logs show incoming webhook

### Phase 4: Advanced Testing

#### Test 4: Image Description
1. Right-click on an image
2. Select "Describe Image"
3. Wait for processing

**Expected:**
- ✅ Modal shows loading state
- ✅ Image description generated
- ⚠️ Requires API key and credits

#### Test 5: Multiple Accounts
1. Process text with account "michalku_com"
2. Process text with account "aicko_cz"
3. Verify different writing styles

**Expected:**
- ✅ Each account uses correct writing profile
- ✅ Output matches account tone/style

## Common Issues & Solutions

### Issue: "API Client not initialized"

**Solution:**
1. Check browser console for errors
2. Verify `settings.json` has `backend` section
3. Reload extension
4. Clear extension storage and reload

### Issue: "401 Unauthorized"

**Solution:**
This is expected! Authentication not yet configured.

To fix:
1. Set up API key in backend
2. Store in extension:
   ```javascript
   chrome.storage.local.set({ apiKey: 'your-key' });
   ```

### Issue: "CORS Error"

**Solution:**
Backend needs CORS headers configured for:
- `chrome-extension://[your-extension-id]`
- Or wildcard for testing

Update backend CORS in `src/index.ts`

### Issue: "Webhook not receiving data"

**Check:**
1. Webhook URL is correct in `settings.json`
2. Webhook is enabled: `webhook.enabled: true`
3. Event is enabled in `webhook.events`
4. Backend logs show incoming request

## Debugging Commands

### Browser Console

```javascript
// Check API client status
apiClient

// Manually trigger webhook
apiClient.sendWebhook('test', { message: 'Hello from extension!' })

// Check stored API key
chrome.storage.local.get(['apiKey'], console.log)

// Clear all storage
chrome.storage.local.clear()
```

### Backend Logs

```bash
# Watch real-time logs
cd backend
npm run tail

# Check D1 database
npx wrangler d1 execute text-processor-db --command "SELECT * FROM users"

# Check KV cache
npx wrangler kv:key list --namespace-id b52a33acf7114a3e842d575b830b980e
```

## Performance Benchmarks

### Expected Response Times

- **Text Processing**: < 2s (depends on AI model)
- **Save to Memory**: < 200ms
- **Webhook Delivery**: < 100ms
- **Settings Load**: < 50ms

### Monitor Performance

```javascript
// In browser console
performance.mark('start');
await apiClient.saveToMemory({ text: 'test' });
performance.mark('end');
performance.measure('api-call', 'start', 'end');
console.log(performance.getEntriesByName('api-call'));
```

## Next Steps

1. ✅ Backend deployed and running
2. ✅ Extension configured with new backend
3. ⏳ **Configure authentication** (API keys)
4. ⏳ **Test all endpoints** systematically
5. ⏳ **Set up monitoring** (error tracking)
6. ⏳ **Production hardening** (rate limits, security)

## Support

- Backend logs: `npm run tail` in `/backend`
- Extension errors: Browser DevTools Console (F12)
- Network issues: DevTools Network tab
- Storage inspection: DevTools → Application → Storage

## Success Criteria

Extension is ready for production when:
- ✅ All Phase 1-3 tests pass
- ✅ No console errors during normal usage
- ✅ Webhooks deliver successfully
- ✅ Response times meet benchmarks
- ✅ Authentication working (when implemented)
- ✅ Error handling graceful (no crashes)

---

**Current Status**: Backend deployed ✅ | Extension configured ✅ | Ready for testing ⏳
