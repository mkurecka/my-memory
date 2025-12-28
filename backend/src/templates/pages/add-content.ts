/**
 * Add Content page - forms for adding memories, tweets, YouTube videos directly from dashboard
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';

export interface AddContentPageProps {
  apiBase: string;
  userId: string;
}

export function addContentPage({ apiBase, userId }: AddContentPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/add', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Add Content',
        subtitle: 'Save memories, tweets, and YouTube videos directly',
        icon: '➕',
        backLink: '/dashboard'
      })}

      <!-- Tab Navigation -->
      <div class="tabs">
        <button class="tab active" data-tab="memory">💾 Memory</button>
        <button class="tab" data-tab="tweet">🐦 Tweet</button>
        <button class="tab" data-tab="youtube">📹 YouTube</button>
      </div>

      <!-- Memory Form -->
      <div id="memory-tab" class="tab-content active">
        <form id="memory-form" class="content-form">
          <div class="form-group">
            <label for="memory-text">Text Content *</label>
            <textarea id="memory-text" name="text" rows="6" placeholder="Enter text to save..." required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="memory-source">Source URL</label>
              <input type="url" id="memory-source" name="sourceUrl" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label for="memory-title">Page Title</label>
              <input type="text" id="memory-title" name="pageTitle" placeholder="Source page title" />
            </div>
          </div>
          <div class="form-group">
            <label for="memory-tags">Tags (comma-separated)</label>
            <input type="text" id="memory-tags" name="tags" placeholder="tag1, tag2, tag3" />
          </div>
          <button type="submit" class="btn-primary">💾 Save Memory</button>
        </form>
      </div>

      <!-- Tweet Form -->
      <div id="tweet-tab" class="tab-content">
        <form id="tweet-form" class="content-form">
          <div class="form-group">
            <label for="tweet-url">Tweet URL *</label>
            <input type="url" id="tweet-url" name="url" placeholder="https://x.com/username/status/123..." required />
            <span class="form-hint">Paste the full tweet URL</span>
          </div>
          <div class="form-group">
            <label for="tweet-text">Tweet Text *</label>
            <textarea id="tweet-text" name="text" rows="4" placeholder="Copy the tweet content here..." required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="tweet-author">Author Name</label>
              <input type="text" id="tweet-author" name="authorName" placeholder="Display name" />
            </div>
            <div class="form-group">
              <label for="tweet-username">Username</label>
              <input type="text" id="tweet-username" name="authorUsername" placeholder="@username" />
            </div>
          </div>
          <div class="form-group">
            <label for="tweet-id">Tweet ID</label>
            <input type="text" id="tweet-id" name="tweetId" placeholder="Auto-extracted from URL" readonly />
          </div>
          <button type="submit" class="btn-primary">🐦 Save Tweet</button>
        </form>
      </div>

      <!-- YouTube Form -->
      <div id="youtube-tab" class="tab-content">
        <form id="youtube-form" class="content-form">
          <div class="form-group">
            <label for="youtube-url">Video URL *</label>
            <input type="url" id="youtube-url" name="url" placeholder="https://youtube.com/watch?v=..." required />
            <span class="form-hint">Paste the YouTube video URL</span>
          </div>
          <div class="form-group">
            <label for="youtube-title">Video Title *</label>
            <input type="text" id="youtube-title" name="title" placeholder="Video title" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="youtube-channel">Channel Name</label>
              <input type="text" id="youtube-channel" name="channelName" placeholder="Channel name" />
            </div>
            <div class="form-group">
              <label for="youtube-duration">Duration</label>
              <input type="text" id="youtube-duration" name="duration" placeholder="12:34" />
            </div>
          </div>
          <div class="form-group">
            <label for="youtube-description">Description</label>
            <textarea id="youtube-description" name="description" rows="3" placeholder="Video description (optional)"></textarea>
          </div>
          <div class="form-group">
            <label for="youtube-id">Video ID</label>
            <input type="text" id="youtube-id" name="videoId" placeholder="Auto-extracted from URL" readonly />
          </div>
          <button type="submit" class="btn-primary">📹 Save Video</button>
        </form>
      </div>

      <!-- Status Messages -->
      <div id="status-message" class="status-message hidden"></div>
    </div>
  `;

  const styles = `
    <style>
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid var(--border);
        padding-bottom: 0.5rem;
      }

      .tab {
        padding: 0.75rem 1.5rem;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        transition: all 0.2s;
      }

      .tab:hover {
        background: var(--background);
        color: var(--text-primary);
      }

      .tab.active {
        background: var(--primary-light);
        color: var(--primary);
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .content-form {
        background: var(--surface);
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--background);
        color: var(--text-primary);
        transition: all 0.2s;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }

      .form-group input[readonly] {
        background: var(--border);
        cursor: not-allowed;
      }

      .form-hint {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      @media (max-width: 600px) {
        .form-row {
          grid-template-columns: 1fr;
        }
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.5rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-1px);
      }

      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .status-message {
        margin-top: 1.5rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
      }

      .status-message.hidden {
        display: none;
      }

      .status-message.success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #6ee7b7;
      }

      .status-message.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      .status-message.loading {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #7dd3fc;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      const USER_ID = '${userId}';

      // Tab switching
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

          tab.classList.add('active');
          const tabId = tab.dataset.tab + '-tab';
          document.getElementById(tabId).classList.add('active');
        });
      });

      // Auto-extract tweet ID from URL
      document.getElementById('tweet-url').addEventListener('input', (e) => {
        const url = e.target.value;
        const match = url.match(/status\\/(\\d+)/);
        if (match) {
          document.getElementById('tweet-id').value = match[1];
        }
      });

      // Auto-extract YouTube video ID from URL
      document.getElementById('youtube-url').addEventListener('input', (e) => {
        const url = e.target.value;
        let videoId = '';

        // youtube.com/watch?v=ID
        const watchMatch = url.match(/[?&]v=([^&]+)/);
        if (watchMatch) videoId = watchMatch[1];

        // youtu.be/ID
        const shortMatch = url.match(/youtu\\.be\\/([^?&]+)/);
        if (shortMatch) videoId = shortMatch[1];

        // youtube.com/embed/ID
        const embedMatch = url.match(/embed\\/([^?&]+)/);
        if (embedMatch) videoId = embedMatch[1];

        document.getElementById('youtube-id').value = videoId;
      });

      // Show status message
      function showStatus(message, type) {
        const el = document.getElementById('status-message');
        el.textContent = message;
        el.className = 'status-message ' + type;
      }

      function hideStatus() {
        document.getElementById('status-message').className = 'status-message hidden';
      }

      // Memory form submission
      document.getElementById('memory-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        showStatus('Saving memory...', 'loading');

        try {
          const response = await fetch(API_BASE + '/api/v1/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'onSaveToMemory',
              userId: USER_ID,
              data: {
                text: form.text.value,
                context: {
                  url: form.sourceUrl.value || null,
                  pageTitle: form.pageTitle.value || null,
                  tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()) : []
                }
              }
            })
          });

          const result = await response.json();

          if (result.success) {
            showStatus('Memory saved successfully!', 'success');
            form.reset();
          } else {
            showStatus('Error: ' + (result.error || 'Failed to save'), 'error');
          }
        } catch (error) {
          showStatus('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });

      // Tweet form submission
      document.getElementById('tweet-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        showStatus('Saving tweet...', 'loading');

        try {
          const response = await fetch(API_BASE + '/api/v1/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'onSaveTweet',
              userId: USER_ID,
              data: {
                data: {
                  tweetId: form.tweetId.value,
                  text: form.text.value,
                  url: form.url.value,
                  author: {
                    name: form.authorName.value || 'Unknown',
                    username: form.authorUsername.value?.replace('@', '') || 'unknown'
                  }
                }
              }
            })
          });

          const result = await response.json();

          if (result.success) {
            showStatus('Tweet saved successfully!', 'success');
            form.reset();
          } else {
            showStatus('Error: ' + (result.error || 'Failed to save'), 'error');
          }
        } catch (error) {
          showStatus('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });

      // YouTube form submission
      document.getElementById('youtube-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        showStatus('Saving video...', 'loading');

        try {
          const response = await fetch(API_BASE + '/api/v1/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'onSaveYouTubeVideo',
              userId: USER_ID,
              data: {
                data: {
                  videoId: form.videoId.value,
                  title: form.title.value,
                  url: form.url.value,
                  channelName: form.channelName.value || 'Unknown',
                  duration: form.duration.value || null,
                  description: form.description.value || null
                }
              }
            })
          });

          const result = await response.json();

          if (result.success) {
            showStatus('Video saved successfully!', 'success');
            form.reset();
          } else {
            showStatus('Error: ' + (result.error || 'Failed to save'), 'error');
          }
        } catch (error) {
          showStatus('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    </script>
  `;

  return baseLayout({
    title: 'Add Content - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
