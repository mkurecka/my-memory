# X/Twitter Integration - Save Tweet Feature

## Overview

The Universal Text Processor extension now includes **X/Twitter integration** that allows you to save tweets directly from X.com (formerly Twitter) with a single click. A save button is automatically injected into every tweet's action bar, alongside the like, retweet, and reply buttons.

## Features

- 🔘 **Save Button on Every Tweet**: Automatically adds a save button to all tweets
- 📊 **Complete Tweet Data**: Captures text, author, media, timestamp, and metadata
- 🪝 **Webhook Notifications**: Sends webhook events when tweets are saved
- 💾 **Local Storage**: Saves tweets to IndexedDB for offline access
- 🔄 **Real-time Updates**: Detects new tweets as you scroll
- ✅ **Visual Feedback**: Shows loading, success, and error states

## How It Works

### 1. Button Injection

When you visit X.com or Twitter.com, the extension automatically:
- Detects that you're on the platform
- Finds all tweet elements (`article[data-testid="tweet"]`)
- Injects a save button into each tweet's action bar
- Watches for new tweets as you scroll or navigate

### 2. Saving a Tweet

When you click the save button:
1. **Extract Data**: Captures tweet text, author info, media, and metadata
2. **Show Loading**: Button shows a loading spinner
3. **Save Locally**: Stores tweet in IndexedDB
4. **Send Webhook**: Triggers webhook notification if enabled
5. **Show Success**: Button shows green checkmark for 2 seconds
6. **Reset**: Button returns to normal state

### 3. Data Captured

Each saved tweet includes:

```json
{
  "tweetId": "1234567890",
  "text": "Tweet content here...",
  "author": {
    "name": "User Name",
    "handle": "username",
    "url": "https://x.com/username"
  },
  "url": "https://x.com/username/status/1234567890",
  "timestamp": "2025-11-21T10:00:00.000Z",
  "media": {
    "images": ["https://pbs.twimg.com/media/..."],
    "videos": ["https://video.twimg.com/..."],
    "hasMedia": true
  },
  "metadata": {
    "isRetweet": false,
    "isQuoteTweet": false,
    "pageTitle": "Tweet / X",
    "capturedAt": "2025-11-21T10:00:00.000Z"
  }
}
```

## Button States

### Normal State
- Gray save icon
- Hover: Blue background with blue icon

### Loading State
- Blue clock icon spinning
- Button disabled (prevents double-clicks)

### Success State
- Green checkmark icon
- Displays for 2 seconds
- Automatically resets

### Error State
- Red X icon
- Displays for 2 seconds
- Automatically resets

## Webhook Integration

When a tweet is saved, the extension sends a webhook notification:

```json
{
  "event": "onSaveTweet",
  "data": {
    "event": "tweet_saved",
    "data": {
      "id": "post_abc123",
      "type": "tweet",
      "originalText": "Tweet content...",
      "context": {
        "tweetId": "1234567890",
        "url": "https://x.com/username/status/1234567890",
        "author": {...},
        "timestamp": "2025-11-21T10:00:00.000Z",
        "media": {...},
        "metadata": {...}
      },
      "status": "pending",
      "createdAt": "2025-11-21T10:00:00.000Z"
    }
  }
}
```

## Configuration

### Enable/Disable Webhook

Edit `extension/settings.json`:

```json
{
  "webhook": {
    "enabled": true,
    "url": "https://your-backend.workers.dev/api/v1/webhook",
    "events": {
      "onSaveTweet": true
    }
  }
}
```

### Customize Button Style

The button uses inline styles for maximum compatibility with X/Twitter's dynamic UI. To customize:

1. Edit `extension/content.js`
2. Find `injectSaveTweetButton` function
3. Modify the `saveButton.style.cssText` property

## Technical Implementation

### Detection
```javascript
function isTwitterPage() {
  return window.location.hostname === 'twitter.com' ||
         window.location.hostname === 'x.com' ||
         window.location.hostname.endsWith('.twitter.com') ||
         window.location.hostname.endsWith('.x.com');
}
```

### Data Extraction
```javascript
function extractTweetData(tweetElement) {
  // Finds tweet text via data-testid="tweetText"
  // Finds author via data-testid="User-Name"
  // Finds timestamp via <time> element
  // Finds media via data-testid="tweetPhoto" and <video> elements
  // Returns structured tweet data object
}
```

### Button Injection
```javascript
function injectSaveTweetButton(tweetElement) {
  // Checks if button already exists (prevents duplicates)
  // Finds action bar via [role="group"]
  // Creates save button with SVG icon
  // Adds click handler to extract and save tweet data
  // Appends button to action bar
}
```

### Observer Pattern
```javascript
function initTwitterObserver() {
  // Processes existing tweets on page load
  // Sets up MutationObserver to watch for new tweets
  // Processes tweets on scroll events (lazy-loaded content)
}
```

## Database Storage

Saved tweets are stored in IndexedDB:

```javascript
{
  id: "post_abc123",
  type: "tweet",
  originalText: "Tweet content...",
  context: {
    tweetId: "1234567890",
    url: "https://x.com/...",
    author: {...},
    timestamp: "...",
    media: {...},
    metadata: {...}
  },
  status: "pending",
  createdAt: "2025-11-21T10:00:00.000Z"
}
```

## Testing

Run the X/Twitter integration tests:

```bash
npm run test:twitter
```

This runs 25 tests covering:
- ✅ Page detection (x.com, twitter.com)
- ✅ Data extraction (text, author, media, metadata)
- ✅ Button injection and styling
- ✅ Event handling and state management
- ✅ Database storage
- ✅ Webhook notifications
- ✅ Observer functionality

## Troubleshooting

### Button Not Appearing

**Cause**: X/Twitter changed their DOM structure
**Fix**: Update the selectors in `extractTweetData` and `injectSaveTweetButton`

**Check Console**: Open DevTools and look for:
```
[Universal Text Processor] Initializing X/Twitter integration
```

### Tweets Not Saving

**Cause**: IndexedDB permission denied or service worker inactive
**Fix**:
1. Check browser console for errors
2. Ensure service worker is active (chrome://extensions/)
3. Try clicking the save button again

### Webhook Not Firing

**Cause**: Webhook disabled in settings or URL incorrect
**Fix**:
1. Check `extension/settings.json`
2. Ensure `webhook.enabled: true`
3. Ensure `webhook.events.onSaveTweet: true`
4. Verify `webhook.url` is correct

### Button Appears Multiple Times

**Cause**: Observer processing tweets multiple times
**Fix**: The code includes a check to prevent duplicates:
```javascript
if (tweetElement.querySelector('.utp-save-tweet-btn')) {
  return;
}
```

If this persists, clear the extension data and reload.

## Browser Compatibility

- ✅ Chrome/Chromium 88+
- ✅ Edge 88+
- ✅ Brave 1.20+
- ❌ Firefox (Manifest V3 not fully supported)
- ❌ Safari (WebExtension API differences)

## Performance

- **Button Injection**: <5ms per tweet
- **Data Extraction**: <10ms per tweet
- **Database Save**: <50ms
- **Webhook Send**: <200ms (network dependent)
- **Memory Usage**: Negligible (<1MB for observer)

## Security

- ✅ No API keys in client code
- ✅ All webhook calls go through backend proxy
- ✅ Input sanitization on tweet data
- ✅ CORS headers properly configured
- ✅ No eval() or unsafe code execution

## Future Enhancements

Potential features for future versions:
- [ ] Bulk save (select multiple tweets)
- [ ] Save thread (save entire tweet thread)
- [ ] Smart categorization (auto-tag tweets)
- [ ] Export saved tweets to CSV/JSON
- [ ] Search saved tweets
- [ ] Sync across devices

## API Reference

### Message Actions

#### `saveTweet`
Saves a tweet to IndexedDB and sends webhook notification.

**Request**:
```javascript
chrome.runtime.sendMessage({
  action: 'saveTweet',
  data: {
    tweetId: '1234567890',
    text: 'Tweet content...',
    author: {...},
    url: 'https://x.com/...',
    timestamp: '2025-11-21T10:00:00.000Z',
    media: {...},
    metadata: {...}
  }
})
```

**Response**:
```javascript
{
  success: true,
  id: 'post_abc123',
  message: 'Tweet saved successfully'
}
```

## Support

For issues or questions:
1. Check console logs for errors
2. Verify extension permissions
3. Test on a different X/Twitter page
4. Report issues on GitHub: https://github.com/mkurecka/x-post-sender/issues

---

**Last Updated**: 2025-11-21
**Version**: 2.2.0
**Status**: ✅ Production Ready
