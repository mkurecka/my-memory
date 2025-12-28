/**
 * Tweets page - displays all saved tweets from X/Twitter
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface TweetsPageProps {
  count: number;
  apiBase: string;
}

export function tweetsPage({ count, apiBase }: TweetsPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/tweets', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Saved Tweets',
        subtitle: 'Tweets saved from X/Twitter',
        icon: '🐦',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search tweets..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Tweets List -->
      <div id="tweets-container">
        ${count === 0 ? emptyState({
          title: 'No Tweets Saved',
          message: 'Visit X/Twitter and use the save button on tweets to save them here.',
          icon: '🐦',
          actionText: 'Go to X',
          actionUrl: 'https://x.com'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>

    <!-- Tweet Detail Modal -->
    <div id="tweet-modal" class="modal" style="display: none;">
      <div class="modal-overlay" onclick="closeModal()"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <div id="modal-body">
          <div class="loading-container"><div class="loading"></div></div>
        </div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .search-box {
        position: relative;
        flex: 1;
        min-width: 200px;
      }

      .search-box input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--surface);
      }

      .search-box input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
      }

      .toolbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .toolbar-actions select {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .tweets-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .tweet-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #1da1f2;
        transition: all 0.2s;
      }

      .tweet-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .tweet-author {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .tweet-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .tweet-author-info {
        flex: 1;
      }

      .tweet-author-name {
        font-weight: 600;
        color: var(--text-primary);
      }

      .tweet-author-handle {
        color: var(--text-secondary);
        font-size: 0.875rem;
      }

      .tweet-text {
        font-size: 0.95rem;
        color: var(--text-primary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 1rem;
      }

      .tweet-media {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .tweet-media img {
        width: 100%;
        border-radius: 8px;
        max-height: 200px;
        object-fit: cover;
      }

      .tweet-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
      }

      .tweet-meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .tweet-link {
        color: #1da1f2;
        text-decoration: none;
        font-weight: 500;
      }

      .tweet-link:hover {
        text-decoration: underline;
      }

      .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        opacity: 0.5;
        transition: all 0.2s;
      }

      .delete-btn:hover {
        opacity: 1;
        background: #fee2e2;
      }

      .pagination {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 2rem;
      }

      .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text-primary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .pagination button:hover:not(:disabled) {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pagination button.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }

      .tweet-card {
        cursor: pointer;
      }

      /* Modal Styles */
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      .modal-content {
        position: relative;
        background: var(--surface);
        border-radius: 16px;
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      }

      .modal-close {
        position: sticky;
        top: 1rem;
        right: 1rem;
        float: right;
        background: var(--background);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 10;
        margin: 1rem;
      }

      .modal-close:hover {
        background: #fee2e2;
      }

      #modal-body {
        padding: 1.5rem;
      }

      .detail-author {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }

      .detail-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        overflow: hidden;
      }

      .detail-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .detail-author-info {
        flex: 1;
      }

      .detail-author-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .detail-author-handle {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }

      .detail-author-handle a {
        color: #1da1f2;
        text-decoration: none;
      }

      .detail-author-handle a:hover {
        text-decoration: underline;
      }

      .detail-text {
        font-size: 1.15rem;
        color: var(--text-primary);
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 1.25rem;
      }

      .detail-media {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .detail-media img {
        width: 100%;
        border-radius: 12px;
        max-height: 400px;
        object-fit: cover;
        cursor: pointer;
      }

      .detail-media img:hover {
        opacity: 0.9;
      }

      .detail-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        margin-bottom: 1.25rem;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }

      .stat-item strong {
        color: var(--text-primary);
      }

      .detail-actions {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .detail-actions a, .detail-actions button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-primary);
        transition: all 0.2s;
      }

      .detail-actions a:hover, .detail-actions button:hover {
        background: var(--background);
      }

      .detail-actions .primary {
        background: #1da1f2;
        color: white;
        border-color: #1da1f2;
      }

      .detail-actions .primary:hover {
        background: #1991db;
      }

      .detail-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
      }

      .detail-section-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentSearch = '';
      let currentSort = 'newest';
      const perPage = 20;

      async function loadTweets() {
        const container = document.getElementById('tweets-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=posts&type=tweet&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let tweets = data.results;

            if (currentSort === 'oldest') {
              tweets = tweets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = tweets.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const tweetUrl = context.url || '';
              const author = context.author || {};
              const authorName = author.displayName || author.name || 'Unknown';
              const authorHandle = author.username || author.handle || '';
              const media = context.media || {};
              const images = media.images || [];

              return \`
                <div class="tweet-card" data-id="\${item.id}" onclick="openModal(\${JSON.stringify(item).replace(/"/g, '&quot;')})">
                  <div class="tweet-author">
                    <div class="tweet-avatar">👤</div>
                    <div class="tweet-author-info">
                      <div class="tweet-author-name">\${escapeHtml(authorName)}</div>
                      \${authorHandle ? \`<div class="tweet-author-handle">@\${escapeHtml(authorHandle)}</div>\` : ''}
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deletePost('\${item.id}', this)" title="Delete">🗑️</button>
                  </div>
                  <div class="tweet-text">\${escapeHtml(item.original_text || '')}</div>
                  \${images.length > 0 ? \`
                    <div class="tweet-media">
                      \${images.slice(0, 4).map(img => \`<img src="\${img}" alt="Tweet media" loading="lazy" />\`).join('')}
                    </div>
                  \` : ''}
                  <div class="tweet-meta">
                    <span class="tweet-meta-item">📅 \${dateStr}</span>
                    \${tweetUrl ? \`<a href="\${tweetUrl}" target="_blank" class="tweet-link tweet-meta-item" onclick="event.stopPropagation()">🔗 View on X</a>\` : ''}
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="tweets-grid">' + html + '</div>';
            updatePagination(data.total || tweets.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No tweets found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load tweets:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load tweets</p></div>';
        }
      }

      function updatePagination(total) {
        const totalPages = Math.ceil(total / perPage);
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
          pagination.innerHTML = '';
          return;
        }

        let html = '';
        html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">← Prev</button>';

        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
          } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span style="padding: 0.5rem;">...</span>';
          }
        }

        html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Next →</button>';
        pagination.innerHTML = html;
      }

      function goToPage(page) {
        currentPage = page;
        loadTweets();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Event listeners
      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value;
        currentPage = 1;
        loadTweets();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadTweets();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deletePost(id, btn) {
        if (!confirm('Delete this tweet?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const response = await fetch(API_BASE + '/api/search/post/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.tweet-card');
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
          } else {
            alert('Failed to delete: ' + data.error);
            btn.textContent = '🗑️';
            btn.disabled = false;
          }
        } catch (error) {
          alert('Error: ' + error.message);
          btn.textContent = '🗑️';
          btn.disabled = false;
        }
      }

      // Modal functions
      function openModal(item) {
        const modal = document.getElementById('tweet-modal');
        const modalBody = document.getElementById('modal-body');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const tweetUrl = context.url || '';
        const author = context.author || {};
        const authorName = author.displayName || author.name || 'Unknown';
        const authorHandle = author.username || author.handle || '';
        const authorAvatar = author.avatarUrl || author.avatar || '';
        const authorUrl = authorHandle ? 'https://x.com/' + authorHandle : '';
        const media = context.media || {};
        const images = media.images || [];
        const videos = media.videos || [];
        const stats = context.stats || context.statistics || {};
        const postedAt = context.postedAt || context.timestamp ? new Date(context.postedAt || context.timestamp).toLocaleString() : '';
        const savedAt = new Date(item.created_at).toLocaleDateString();
        const text = item.original_text || context.text || '';

        modalBody.innerHTML = \`
          <div class="detail-author">
            <div class="detail-avatar">
              \${authorAvatar ? '<img src="' + authorAvatar + '" alt="' + escapeHtml(authorName) + '" />' : '👤'}
            </div>
            <div class="detail-author-info">
              <div class="detail-author-name">\${escapeHtml(authorName)}</div>
              \${authorHandle ? \`
                <div class="detail-author-handle">
                  <a href="\${authorUrl}" target="_blank">@\${escapeHtml(authorHandle)}</a>
                </div>
              \` : ''}
            </div>
          </div>

          <div class="detail-text">\${escapeHtml(text)}</div>

          \${images.length > 0 ? \`
            <div class="detail-media">
              \${images.map(img => \`<img src="\${img}" alt="Tweet media" loading="lazy" onclick="window.open('\${img}', '_blank')" />\`).join('')}
            </div>
          \` : ''}

          \${videos.length > 0 ? \`
            <div style="background:var(--background);padding:1rem;border-radius:8px;margin-bottom:1.25rem;">
              <span>🎬 \${videos.length} video(s) attached</span>
            </div>
          \` : ''}

          <div class="detail-stats">
            \${stats.likes !== undefined ? \`<span class="stat-item">❤️ <strong>\${formatNumber(stats.likes)}</strong> likes</span>\` : ''}
            \${stats.retweets !== undefined ? \`<span class="stat-item">🔁 <strong>\${formatNumber(stats.retweets)}</strong> retweets</span>\` : ''}
            \${stats.replies !== undefined ? \`<span class="stat-item">💬 <strong>\${formatNumber(stats.replies)}</strong> replies</span>\` : ''}
            \${stats.views !== undefined ? \`<span class="stat-item">👁️ <strong>\${formatNumber(stats.views)}</strong> views</span>\` : ''}
            \${postedAt ? \`<span class="stat-item">📅 \${postedAt}</span>\` : ''}
          </div>

          <div class="detail-actions">
            \${tweetUrl ? '<a href="' + tweetUrl + '" target="_blank" class="primary">🐦 View on X</a>' : ''}
            <button onclick="copyToClipboard(decodeURIComponent('\${encodeURIComponent(text)}'))">📋 Copy Text</button>
          </div>

          <div class="detail-section">
            <h3 class="detail-section-title">🤖 Create Task from Tweet</h3>
            <form id="task-form" onsubmit="submitTask(event, '\${item.id}', 'tweet')">
              <textarea id="task-input" placeholder="Describe what you want to do with this tweet..." rows="3" style="width:100%;padding:0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.9rem;resize:vertical;margin-bottom:0.75rem;"></textarea>
              <div style="display:flex;gap:0.75rem;align-items:center;">
                <button type="submit" style="background:var(--primary);color:white;border:none;padding:0.625rem 1.25rem;border-radius:8px;font-weight:500;cursor:pointer;">📤 Send Task</button>
                <span id="task-status" style="font-size:0.875rem;color:var(--text-secondary);"></span>
              </div>
            </form>
          </div>

          <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-secondary);">
            <span>💾 Saved: \${savedAt}</span>
            <span style="margin-left:1rem;">🆔 ID: \${item.id}</span>
          </div>
        \`;

        window.currentItem = item;
      }

      function closeModal() {
        const modal = document.getElementById('tweet-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.currentItem = null;
      }

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });

      function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
      }

      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Copied to clipboard!');
        });
      }

      async function submitTask(event, itemId, itemType) {
        event.preventDefault();
        const input = document.getElementById('task-input');
        const status = document.getElementById('task-status');
        const task = input.value.trim();

        if (!task) {
          status.textContent = 'Please enter a task description';
          status.style.color = '#ef4444';
          return;
        }

        status.textContent = 'Sending...';
        status.style.color = 'var(--text-secondary)';

        try {
          const item = window.currentItem;
          const context = item.context_json ? JSON.parse(item.context_json) : {};

          const payload = {
            event: 'memory_task',
            data: {
              task: task,
              itemId: itemId,
              itemType: itemType,
              text: item.original_text || context.text || '',
              url: context.url || '',
              author: context.author || {},
              context: context,
              createdAt: new Date().toISOString()
            }
          };

          const response = await fetch(API_BASE + '/api/v1/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            status.textContent = '✓ Task sent successfully!';
            status.style.color = '#22c55e';
            input.value = '';
          } else {
            status.textContent = 'Failed: ' + (result.error || 'Unknown error');
            status.style.color = '#ef4444';
          }
        } catch (error) {
          status.textContent = 'Error: ' + error.message;
          status.style.color = '#ef4444';
        }
      }

      // Initial load
      if (${count} > 0) {
        loadTweets();
      }
    </script>
  `;

  return baseLayout({
    title: 'Tweets - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
