/**
 * Unified Memories page - displays all saved items (memories, tweets, videos)
 * Single interface with type filtering
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';
import { skeletonGrid, skeletonStyles } from '../components/skeleton';

export interface UnifiedMemoriesPageProps {
  counts: {
    total: number;
    memories: number;
    tweets: number;
    videos: number;
  };
  apiBase: string;
}

export function unifiedMemoriesPage({ counts, apiBase }: UnifiedMemoriesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/memories', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'All Memories',
        subtitle: 'Videos, tweets, and text snippets in one place',
        icon: '🧠',
        count: counts.total,
        backLink: '/dashboard'
      })}

      <!-- Type Filter -->
      <div class="type-filter">
        <button class="filter-btn active" data-type="all">
          <span>📦</span> All <span class="filter-count">${counts.total}</span>
        </button>
        <button class="filter-btn" data-type="memory">
          <span>💾</span> Memories <span class="filter-count">${counts.memories}</span>
        </button>
        <button class="filter-btn" data-type="tweet">
          <span>🐦</span> Tweets <span class="filter-count">${counts.tweets}</span>
        </button>
        <button class="filter-btn" data-type="youtube_video">
          <span>📹</span> Videos <span class="filter-count">${counts.videos}</span>
        </button>
      </div>

      <!-- Search and Sort -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search all memories..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Items Grid -->
      <div id="items-container">
        ${counts.total === 0 ? emptyState({
          title: 'No Memories Yet',
          message: 'Save tweets, videos, or text snippets using the extension.',
          icon: '🧠',
          actionText: 'Add Content',
          actionUrl: '/dashboard/add'
        }) : skeletonGrid(5)}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>

    <!-- Detail Modal -->
    <div id="detail-modal" class="modal" style="display: none;">
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
      ${skeletonStyles}

      /* Type Filter */
      .type-filter {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .filter-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .filter-btn:hover {
        border-color: var(--primary);
        color: var(--text-primary);
      }

      .filter-btn.active {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
      }

      .filter-count {
        background: rgba(255,255,255,0.2);
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
      }

      .filter-btn:not(.active) .filter-count {
        background: var(--background);
      }

      /* Toolbar */
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

      /* Items Grid */
      .items-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      /* Unified Card Base */
      .item-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
        cursor: pointer;
        display: flex;
        gap: 1rem;
      }

      .item-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* Type-specific borders */
      .item-card[data-type="memory"] { border-left: 4px solid #8b5cf6; }
      .item-card[data-type="tweet"] { border-left: 4px solid #1da1f2; }
      .item-card[data-type="youtube_video"] { border-left: 4px solid #ff0000; }

      .item-thumbnail {
        width: 120px;
        height: 68px;
        border-radius: 8px;
        background: var(--background);
        flex-shrink: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .item-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .item-thumbnail-icon {
        font-size: 2rem;
      }

      .item-content {
        flex: 1;
        min-width: 0;
      }

      .item-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .item-type-badge {
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        flex-shrink: 0;
      }

      .item-type-badge.memory { background: #ede9fe; color: #7c3aed; }
      .item-type-badge.tweet { background: #e0f2fe; color: #0284c7; }
      .item-type-badge.youtube_video { background: #fee2e2; color: #dc2626; }

      .item-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex: 1;
      }

      .item-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }

      .item-text {
        font-size: 0.9rem;
        color: var(--text-primary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.75rem;
      }

      .item-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        align-items: center;
      }

      .item-meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .item-link {
        color: var(--primary);
        text-decoration: none;
      }

      .item-link:hover {
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
        margin-left: auto;
      }

      .delete-btn:hover {
        opacity: 1;
        background: #fee2e2;
      }

      .transcript-badge {
        background: #ecfdf5;
        color: #059669;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.7rem;
      }

      /* Pagination */
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
        max-width: 900px;
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

      /* Modal Detail Styles */
      .detail-header {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .detail-thumbnail {
        width: 320px;
        flex-shrink: 0;
        border-radius: 12px;
        overflow: hidden;
        background: var(--background);
      }

      .detail-thumbnail img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
      }

      .detail-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        flex-shrink: 0;
      }

      .detail-icon.memory { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); }
      .detail-icon.tweet { background: linear-gradient(135deg, #1da1f2 0%, #60a5fa 100%); }
      .detail-icon.youtube_video { background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%); }

      .detail-info {
        flex: 1;
        min-width: 0;
      }

      .detail-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
        line-height: 1.4;
      }

      .detail-subtitle {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }

      .detail-subtitle a {
        color: var(--primary);
        text-decoration: none;
      }

      .detail-subtitle a:hover {
        text-decoration: underline;
      }

      .detail-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: var(--background);
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        font-size: 0.875rem;
      }

      .stat-item strong {
        color: var(--text-primary);
      }

      .detail-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
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
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .detail-actions .primary:hover {
        opacity: 0.9;
      }

      .detail-actions .primary.youtube { background: #ff0000; border-color: #ff0000; }
      .detail-actions .primary.twitter { background: #1da1f2; border-color: #1da1f2; }
      .detail-actions .primary.memory { background: #8b5cf6; border-color: #8b5cf6; }

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

      .detail-text-full {
        background: var(--background);
        padding: 1.25rem;
        border-radius: 12px;
        font-size: 1rem;
        color: var(--text-primary);
        line-height: 1.8;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 400px;
        overflow-y: auto;
      }

      .detail-description {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.7;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
      }

      .detail-transcript {
        background: var(--background);
        padding: 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        line-height: 1.7;
        max-height: 300px;
        overflow-y: auto;
        white-space: pre-wrap;
      }

      .transcript-unavailable {
        color: var(--text-secondary);
        font-style: italic;
        padding: 1rem;
        text-align: center;
        background: var(--background);
        border-radius: 8px;
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

      @media (max-width: 768px) {
        .detail-header {
          flex-direction: column;
        }
        .detail-thumbnail {
          width: 100%;
        }
        .item-thumbnail {
          display: none;
        }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentSearch = '';
      let currentSort = 'newest';
      let currentType = 'all';
      const perPage = 20;

      // Filter button handlers
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentType = this.dataset.type;
          currentPage = 1;
          loadItems();
        });
      });

      async function loadItems() {
        const container = document.getElementById('items-container');
        container.innerHTML = \`${skeletonGrid(5)}\`;

        try {
          const offset = (currentPage - 1) * perPage;
          let results = [];
          let total = 0;

          if (currentType === 'all' || currentType === 'memory') {
            const memoryUrl = API_BASE + '/api/search/recent?table=memory&limit=' + perPage + '&offset=' + offset + (currentSearch ? '&q=' + encodeURIComponent(currentSearch) : '');
            const memRes = await fetch(memoryUrl);
            const memData = await memRes.json();
            if (memData.success && memData.results) {
              results = results.concat(memData.results.map(m => ({ ...m, itemType: 'memory' })));
              total += memData.total || memData.results.length;
            }
          }

          if (currentType === 'all' || currentType === 'tweet') {
            const tweetUrl = API_BASE + '/api/search/recent?table=posts&type=tweet&limit=' + perPage + '&offset=' + offset + (currentSearch ? '&q=' + encodeURIComponent(currentSearch) : '');
            const tweetRes = await fetch(tweetUrl);
            const tweetData = await tweetRes.json();
            if (tweetData.success && tweetData.results) {
              results = results.concat(tweetData.results.map(t => ({ ...t, itemType: 'tweet' })));
              total += tweetData.total || tweetData.results.length;
            }
          }

          if (currentType === 'all' || currentType === 'youtube_video') {
            const videoUrl = API_BASE + '/api/search/recent?table=posts&type=youtube_video&limit=' + perPage + '&offset=' + offset + (currentSearch ? '&q=' + encodeURIComponent(currentSearch) : '');
            const videoRes = await fetch(videoUrl);
            const videoData = await videoRes.json();
            if (videoData.success && videoData.results) {
              results = results.concat(videoData.results.map(v => ({ ...v, itemType: 'youtube_video' })));
              total += videoData.total || videoData.results.length;
            }
          }

          // Sort combined results
          results.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
          });

          // Limit to perPage
          results = results.slice(0, perPage);

          if (results.length > 0) {
            const html = results.map(item => renderCard(item)).join('');
            container.innerHTML = '<div class="items-grid">' + html + '</div>';
            updatePagination(total);
          } else {
            container.innerHTML = '<div class="no-results"><p>No items found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load items:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load items</p></div>';
        }
      }

      function renderCard(item) {
        const date = new Date(item.created_at);
        const dateStr = date.toLocaleDateString();
        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const type = item.itemType || item.type || 'memory';

        let thumbnail = '';
        let title = '';
        let subtitle = '';
        let text = '';
        let link = '';
        let linkText = '';
        let typeLabel = '';
        let typeIcon = '';
        let hasTranscript = false;

        if (type === 'youtube_video') {
          const videoUrl = context.url || '';
          let videoId = context.videoId || '';
          if (!videoId && videoUrl) {
            const match = videoUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
            if (match) videoId = match[1];
          }
          thumbnail = context.thumbnail || (videoId ? 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg' : '');
          title = item.original_text || context.title || 'Untitled Video';
          const channel = context.channel || {};
          subtitle = channel.name || channel.title || context.channelName || '';
          link = videoUrl;
          linkText = 'Watch';
          typeLabel = 'Video';
          typeIcon = '📹';
          hasTranscript = context.transcript?.available && context.transcript?.text;
        } else if (type === 'tweet') {
          const author = context.author || {};
          title = author.displayName || author.name || 'Unknown';
          subtitle = author.username ? '@' + author.username : '';
          text = item.original_text || '';
          const images = context.media?.images || [];
          thumbnail = images[0] || '';
          link = context.url || '';
          linkText = 'View on X';
          typeLabel = 'Tweet';
          typeIcon = '🐦';
        } else {
          title = 'Memory Snippet';
          text = item.text || '';
          subtitle = context.pageTitle || '';
          link = context.url || '';
          linkText = 'Source';
          typeLabel = 'Memory';
          typeIcon = '💾';
        }

        const itemData = JSON.stringify(item).replace(/"/g, '&quot;');

        return \`
          <div class="item-card" data-type="\${type}" data-id="\${item.id}" onclick="openModal(\${itemData}, '\${type}')">
            \${thumbnail ? \`
              <div class="item-thumbnail">
                <img src="\${thumbnail}" alt="" loading="lazy" />
              </div>
            \` : \`
              <div class="item-thumbnail">
                <span class="item-thumbnail-icon">\${typeIcon}</span>
              </div>
            \`}
            <div class="item-content">
              <div class="item-header">
                <span class="item-type-badge \${type}">\${typeLabel}</span>
                <span class="item-title">\${escapeHtml(title)}</span>
              </div>
              \${subtitle ? \`<div class="item-subtitle">\${escapeHtml(subtitle)}</div>\` : ''}
              \${text ? \`<div class="item-text">\${escapeHtml(text)}</div>\` : ''}
              <div class="item-meta">
                <span class="item-meta-item">📅 \${dateStr}</span>
                \${hasTranscript ? '<span class="item-meta-item transcript-badge" title="Transcript available">📜</span>' : ''}
                \${link ? \`<a href="\${link}" target="_blank" class="item-link item-meta-item" onclick="event.stopPropagation()">🔗 \${linkText}</a>\` : ''}
                <button class="delete-btn" onclick="event.stopPropagation(); deleteItem('\${item.id}', '\${type}', this)" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        \`;
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

        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
          html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
        }

        html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Next →</button>';
        pagination.innerHTML = html;
      }

      function goToPage(page) {
        currentPage = page;
        loadItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value;
        currentPage = 1;
        loadItems();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadItems();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deleteItem(id, type, btn) {
        if (!confirm('Delete this item?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const endpoint = type === 'memory' ? '/api/search/memory/' : '/api/search/post/';
          const response = await fetch(API_BASE + endpoint + id, { method: 'DELETE' });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.item-card');
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
      function openModal(item, type) {
        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        window.currentItem = item;
        window.currentItemType = type;

        if (type === 'youtube_video') {
          renderVideoModal(item, modalBody);
        } else if (type === 'tweet') {
          renderTweetModal(item, modalBody);
        } else {
          renderMemoryModal(item, modalBody);
        }
      }

      function renderVideoModal(item, container) {
        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const videoUrl = context.url || '';
        const channel = context.channel || {};
        const channelName = channel.name || channel.title || context.channelName || 'Unknown Channel';
        const channelUrl = channel.url || '';
        const thumbnail = context.thumbnail || '';
        const title = item.original_text || context.title || 'Untitled Video';
        const description = context.description || '';
        const duration = context.duration?.formatted || context.duration || '';
        const stats = context.statistics || {};
        const transcript = context.transcript || {};
        const savedAt = new Date(item.created_at).toLocaleDateString();

        let videoId = context.videoId || '';
        if (!videoId && videoUrl) {
          const match = videoUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
          if (match) videoId = match[1];
        }
        const thumbUrl = thumbnail || (videoId ? 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg' : '');

        container.innerHTML = \`
          <div class="detail-header">
            <div class="detail-thumbnail">
              \${thumbUrl ? '<img src="' + thumbUrl + '" alt="' + escapeHtml(title) + '" />' : '<div style="height:180px;display:flex;align-items:center;justify-content:center;font-size:4rem;">📹</div>'}
            </div>
            <div class="detail-info">
              <h2 class="detail-title">\${escapeHtml(title)}</h2>
              <div class="detail-subtitle">
                📺 \${channelUrl ? '<a href="' + channelUrl + '" target="_blank">' + escapeHtml(channelName) + '</a>' : escapeHtml(channelName)}
              </div>
              <div class="detail-stats">
                \${duration ? '<span class="stat-item">⏱️ ' + duration + '</span>' : ''}
                \${stats.viewsFormatted ? '<span class="stat-item">👁️ ' + stats.viewsFormatted + '</span>' : ''}
                \${stats.likesFormatted ? '<span class="stat-item">👍 ' + stats.likesFormatted + '</span>' : ''}
              </div>
              <div class="detail-actions">
                \${videoUrl ? '<a href="' + videoUrl + '" target="_blank" class="primary youtube">▶️ Watch on YouTube</a>' : ''}
                <button onclick="copyToClipboard('\${escapeHtml(title)}')">📋 Copy Title</button>
              </div>
            </div>
          </div>

          \${description ? \`<div class="detail-section"><h3 class="detail-section-title">📝 Description</h3><div class="detail-description">\${escapeHtml(description)}</div></div>\` : ''}

          <div class="detail-section">
            <h3 class="detail-section-title">📜 Transcript \${transcript.available && transcript.text ? '(' + (transcript.wordCount || 0) + ' words)' : ''}</h3>
            <div id="transcript-container">
              \${transcript.available && transcript.text ? \`<div class="detail-transcript">\${escapeHtml(transcript.text)}</div>\` : \`
                <div class="transcript-unavailable">
                  <p>No transcript loaded</p>
                  <button onclick="fetchTranscript('\${videoId}')" style="margin-top:0.75rem;background:var(--primary);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;">
                    📥 Fetch Transcript
                  </button>
                </div>
              \`}
            </div>
          </div>

          <div class="detail-section">
            <h3 class="detail-section-title">🤖 Create Task</h3>
            <form id="task-form" onsubmit="submitTask(event)">
              <textarea id="task-input" placeholder="Describe what you want to do with this video..." rows="3" style="width:100%;padding:0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.9rem;resize:vertical;margin-bottom:0.75rem;"></textarea>
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
      }

      function renderTweetModal(item, container) {
        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const tweetUrl = context.url || '';
        const author = context.author || {};
        const authorName = author.displayName || author.name || 'Unknown';
        const authorHandle = author.username || author.handle || '';
        const authorAvatar = author.avatarUrl || author.avatar || '';
        const authorUrl = authorHandle ? 'https://x.com/' + authorHandle : '';
        const media = context.media || {};
        const images = media.images || [];
        const stats = context.stats || context.statistics || {};
        const postedAt = context.postedAt || context.timestamp ? new Date(context.postedAt || context.timestamp).toLocaleString() : '';
        const savedAt = new Date(item.created_at).toLocaleDateString();
        const text = item.original_text || context.text || '';

        container.innerHTML = \`
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">
            <div class="detail-icon tweet">
              \${authorAvatar ? '<img src="' + authorAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" />' : '👤'}
            </div>
            <div class="detail-info">
              <div class="detail-title" style="font-size:1.1rem;margin-bottom:0.25rem;">\${escapeHtml(authorName)}</div>
              \${authorHandle ? '<div class="detail-subtitle"><a href="' + authorUrl + '" target="_blank">@' + escapeHtml(authorHandle) + '</a></div>' : ''}
            </div>
          </div>

          <div class="detail-text-full">\${escapeHtml(text)}</div>

          \${images.length > 0 ? \`
            <div class="detail-media" style="margin-top:1rem;">
              \${images.map(img => '<img src="' + img + '" alt="Tweet media" loading="lazy" onclick="window.open(\\'' + img + '\\', \\'_blank\\')" />').join('')}
            </div>
          \` : ''}

          <div class="detail-stats" style="margin-top:1rem;">
            \${stats.likes !== undefined ? '<span class="stat-item">❤️ <strong>' + formatNumber(stats.likes) + '</strong></span>' : ''}
            \${stats.retweets !== undefined ? '<span class="stat-item">🔁 <strong>' + formatNumber(stats.retweets) + '</strong></span>' : ''}
            \${stats.replies !== undefined ? '<span class="stat-item">💬 <strong>' + formatNumber(stats.replies) + '</strong></span>' : ''}
            \${stats.views !== undefined ? '<span class="stat-item">👁️ <strong>' + formatNumber(stats.views) + '</strong></span>' : ''}
            \${postedAt ? '<span class="stat-item">📅 ' + postedAt + '</span>' : ''}
          </div>

          <div class="detail-actions" style="margin-top:1rem;">
            \${tweetUrl ? '<a href="' + tweetUrl + '" target="_blank" class="primary twitter">🐦 View on X</a>' : ''}
            <button onclick="copyToClipboard(decodeURIComponent('\${encodeURIComponent(text)}'))">📋 Copy Text</button>
          </div>

          <div class="detail-section">
            <h3 class="detail-section-title">🤖 Create Task</h3>
            <form id="task-form" onsubmit="submitTask(event)">
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
      }

      function renderMemoryModal(item, container) {
        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const sourceUrl = context.url || '';
        const pageTitle = context.pageTitle || 'Source';
        const text = item.text || '';
        const wordCount = text.split(/\\s+/).filter(w => w.length > 0).length;
        const charCount = text.length;
        const savedAt = new Date(item.created_at).toLocaleString();
        const tag = item.tag || '';
        const priority = item.priority || 'medium';

        container.innerHTML = \`
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);">
            <div class="detail-icon memory">💾</div>
            <div class="detail-info">
              <div class="detail-title" style="font-size:1.1rem;margin-bottom:0.25rem;">Memory Snippet</div>
              <div class="detail-subtitle">
                \${sourceUrl ? '<a href="' + sourceUrl + '" target="_blank">' + escapeHtml(pageTitle) + '</a>' : 'No source URL'}
              </div>
            </div>
          </div>

          <div class="detail-text-full">\${escapeHtml(text)}</div>

          <div class="detail-stats" style="margin-top:1rem;">
            <span class="stat-item">📝 <strong>\${wordCount}</strong> words</span>
            <span class="stat-item">🔤 <strong>\${charCount}</strong> chars</span>
            <span class="stat-item">📅 \${savedAt}</span>
            \${tag ? '<span class="stat-item">🏷️ ' + escapeHtml(tag) + '</span>' : ''}
            <span class="stat-item">⚡ \${priority}</span>
          </div>

          <div class="detail-actions" style="margin-top:1rem;">
            \${sourceUrl ? '<a href="' + sourceUrl + '" target="_blank" class="primary memory">🔗 Open Source</a>' : ''}
            <button onclick="copyToClipboard(decodeURIComponent('\${encodeURIComponent(text)}'))">📋 Copy Text</button>
          </div>

          <div class="detail-section">
            <h3 class="detail-section-title">🤖 Create Task</h3>
            <form id="task-form" onsubmit="submitTask(event)">
              <textarea id="task-input" placeholder="Describe what you want to do with this memory..." rows="3" style="width:100%;padding:0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.9rem;resize:vertical;margin-bottom:0.75rem;"></textarea>
              <div style="display:flex;gap:0.75rem;align-items:center;">
                <button type="submit" style="background:var(--primary);color:white;border:none;padding:0.625rem 1.25rem;border-radius:8px;font-weight:500;cursor:pointer;">📤 Send Task</button>
                <span id="task-status" style="font-size:0.875rem;color:var(--text-secondary);"></span>
              </div>
            </form>
          </div>

          <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-secondary);">
            <span>🆔 ID: \${item.id}</span>
          </div>
        \`;
      }

      function closeModal() {
        const modal = document.getElementById('detail-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.currentItem = null;
        window.currentItemType = null;
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

      async function fetchTranscript(videoId) {
        if (!videoId) {
          alert('No video ID available');
          return;
        }

        const container = document.getElementById('transcript-container');
        container.innerHTML = '<div style="text-align:center;padding:1rem;"><div class="loading"></div><p style="margin-top:0.75rem;color:var(--text-secondary);">Fetching transcript...</p></div>';

        try {
          const response = await fetch(API_BASE + '/api/proxy/youtube/transcript/' + videoId + '?lang=en');
          const result = await response.json();

          if (result.success && result.data?.transcript?.available) {
            const transcript = result.data.transcript;
            container.innerHTML = '<div class="detail-transcript">' + escapeHtml(transcript.text) + '</div>';

            // Save transcript to database to avoid re-fetching
            const item = window.currentItem;
            if (item && item.id) {
              try {
                const saveResponse = await fetch(API_BASE + '/api/search/post/' + item.id + '/transcript', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ transcript: transcript })
                });
                const saveResult = await saveResponse.json();
                if (saveResult.success) {
                  console.log('[Transcript] Saved to database:', saveResult.wordCount, 'words');
                } else {
                  console.warn('[Transcript] Failed to save:', saveResult.error);
                }
              } catch (saveError) {
                console.warn('[Transcript] Error saving to database:', saveError.message);
              }
            }
          } else {
            container.innerHTML = '<div class="transcript-unavailable"><p>No transcript available</p><p style="font-size:0.8rem;margin-top:0.5rem;">' + (result.data?.transcript?.error || result.error || 'Not found') + '</p></div>';
          }
        } catch (error) {
          container.innerHTML = '<div class="transcript-unavailable"><p>Failed to fetch transcript</p><p style="font-size:0.8rem;margin-top:0.5rem;">' + error.message + '</p></div>';
        }
      }

      async function submitTask(event) {
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
          const type = window.currentItemType;
          const context = item.context_json ? JSON.parse(item.context_json) : {};

          const payload = {
            task: task,
            source_item_id: item.id,
            source_item_type: type,
            source_text: item.text || item.original_text || '',
            source_url: context.url || '',
            source_context: context
          };

          const response = await fetch(API_BASE + '/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (result.success) {
            status.textContent = '✓ Task created successfully!';
            status.style.color = '#22c55e';
            input.value = '';

            // Send webhook and capture response for thread history
            try {
              const webhookResponse = await fetch(API_BASE + '/api/v1/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'memory_task',
                  data: { ...payload, task_id: result.task_id, is_new: true }
                })
              });

              if (webhookResponse.ok) {
                const webhookData = await webhookResponse.json();

                // Save webhook response to task conversation thread
                if (webhookData && (webhookData.message || webhookData.response || webhookData.data)) {
                  const responseText = webhookData.message || webhookData.response || JSON.stringify(webhookData.data);

                  await fetch(API_BASE + '/api/tasks/' + result.task_id + '/follow-up', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'system',
                      message: responseText
                    })
                  });
                }
              }
            } catch (webhookError) {
              console.error('Webhook error:', webhookError);
            }
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
      if (${counts.total} > 0) {
        loadItems();
      }
    </script>
  `;

  return baseLayout({
    title: 'Memories - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
