/**
 * Memories page - displays all saved memories
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface MemoriesPageProps {
  count: number;
  apiBase: string;
}

export function memoriesPage({ count, apiBase }: MemoriesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/memories', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Memories',
        subtitle: 'All your saved text snippets and notes',
        icon: '💾',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search memories..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="exportMemories()">
            📥 Export
          </button>
        </div>
      </div>

      <!-- Type Filters -->
      <div class="type-filters">
        <button class="type-filter active" data-type="">All</button>
        <button class="type-filter" data-type="link">🔗 Links</button>
        <button class="type-filter" data-type="video">📹 Videos</button>
        <button class="type-filter" data-type="tweet">🐦 Tweets</button>
      </div>

      <!-- Memories List -->
      <div id="memories-container">
        ${count === 0 ? emptyState({
          title: 'No Memories Yet',
          message: 'Select any text on a webpage and use the extension to save it to your memories.',
          icon: '💾',
          actionText: 'Learn More',
          actionUrl: '/setup'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>

    <!-- Memory Detail Modal -->
    <div id="memory-modal" class="modal" style="display: none;">
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

      .type-filters {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .type-filter {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
        color: var(--text-secondary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .type-filter:hover {
        background: var(--background);
        border-color: var(--primary);
        color: var(--primary);
      }

      .type-filter.active {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
      }

      .memory-type-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .memory-type-badge.link {
        background: #dbeafe;
        color: #1e40af;
      }

      .memory-type-badge.video {
        background: #fee2e2;
        color: #991b1b;
      }

      .memory-type-badge.tweet {
        background: #e0f2fe;
        color: #0369a1;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .memories-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .memory-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #8b5cf6;
        transition: all 0.2s;
      }

      .memory-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .memory-text {
        font-size: 0.95rem;
        color: var(--text-primary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 1rem;
      }

      .memory-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .memory-meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .memory-source {
        color: var(--primary);
        text-decoration: none;
      }

      .memory-source:hover {
        text-decoration: underline;
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

      .memory-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        align-items: center;
      }

      .memory-card {
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

      .detail-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .detail-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        flex-shrink: 0;
      }

      .detail-meta-info {
        flex: 1;
      }

      .detail-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .detail-subtitle {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }

      .detail-subtitle a {
        color: var(--primary);
        text-decoration: none;
      }

      .detail-subtitle a:hover {
        text-decoration: underline;
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
        margin-bottom: 1.5rem;
        max-height: 400px;
        overflow-y: auto;
      }

      .detail-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        margin-bottom: 1.5rem;
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
        background: #8b5cf6;
        color: white;
        border-color: #8b5cf6;
      }

      .detail-actions .primary:hover {
        background: #7c3aed;
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

      /* Task Section Styles */
      .task-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 12px;
        transition: all 0.3s ease;
      }

      .task-section:hover {
        border-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
      }

      .task-header {
        margin-bottom: 1.25rem;
      }

      .task-header-content {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
      }

      .task-icon {
        font-size: 2rem;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .task-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        line-height: 1.3;
      }

      .task-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0.25rem 0 0 0;
        line-height: 1.4;
      }

      .task-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .task-input-wrapper {
        position: relative;
      }

      .task-textarea {
        width: 100%;
        padding: 1rem;
        border: 2px solid var(--border);
        border-radius: 10px;
        font-size: 0.9375rem;
        font-family: inherit;
        line-height: 1.6;
        resize: vertical;
        min-height: 100px;
        transition: all 0.2s ease;
        background: var(--bg-primary);
      }

      .task-textarea:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      .task-textarea::placeholder {
        color: var(--text-tertiary);
      }

      .task-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .task-submit-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      }

      .task-submit-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }

      .task-submit-btn:active {
        transform: translateY(0);
      }

      .btn-icon {
        font-size: 1.125rem;
        line-height: 1;
      }

      .task-status {
        font-size: 0.875rem;
        font-weight: 500;
        transition: color 0.2s ease;
      }

      .task-status.success {
        color: #22c55e;
      }

      .task-status.error {
        color: #ef4444;
      }

      .task-status.loading {
        color: var(--text-secondary);
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentSearch = '';
      let currentSort = 'newest';
      let currentType = '';
      const perPage = 20;

      async function loadMemories() {
        const container = document.getElementById('memories-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=memory&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }
          if (currentType) {
            url += '&tag=' + encodeURIComponent(currentType);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let memories = data.results;

            // Sort
            if (currentSort === 'oldest') {
              memories = memories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = memories.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const url = context.url || '';
              const pageTitle = context.pageTitle || context.title || 'Source';
              const tag = item.tag || context.type || '';

              // Determine type badge
              let typeBadge = '';
              if (tag === 'link' || (item.text && item.text.match(/^https?:\\/\\//) && item.text.length < 500)) {
                typeBadge = '<span class="memory-type-badge link">🔗 Link</span>';
              } else if (tag === 'video' || context.videoId) {
                typeBadge = '<span class="memory-type-badge video">📹 Video</span>';
              } else if (tag === 'tweet' || context.tweetId) {
                typeBadge = '<span class="memory-type-badge tweet">🐦 Tweet</span>';
              }

              return \`
                <div class="memory-card" data-id="\${item.id}" onclick="openModal(\${JSON.stringify(item).replace(/"/g, '&quot;')})">
                  <div class="memory-text">\${escapeHtml(item.text)}</div>
                  <div class="memory-meta">
                    \${typeBadge}
                    <span class="memory-meta-item">📅 \${dateStr}</span>
                    \${url ? \`<a href="\${url}" target="_blank" class="memory-source memory-meta-item" onclick="event.stopPropagation()">🔗 \${pageTitle}</a>\` : ''}
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteMemory('\${item.id}', this)" title="Delete">🗑️</button>
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="memories-grid">' + html + '</div>';
            updatePagination(data.total || memories.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No memories found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load memories:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load memories</p></div>';
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
        loadMemories();
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
        loadMemories();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadMemories();
      });

      // Type filter click handlers
      document.querySelectorAll('.type-filter').forEach(btn => {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.type-filter').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentType = this.dataset.type;
          currentPage = 1;
          loadMemories();
        });
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deleteMemory(id, btn) {
        if (!confirm('Delete this memory?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const response = await fetch(API_BASE + '/api/search/memory/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.memory-card');
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
        const modal = document.getElementById('memory-modal');
        const modalBody = document.getElementById('modal-body');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const sourceUrl = context.url || '';
        const pageTitle = context.pageTitle || 'Source';
        const text = item.text || '';
        const wordCount = text.split(/\\s+/).filter(w => w.length > 0).length;
        const charCount = text.length;
        const savedAt = new Date(item.created_at).toLocaleString();
        const tag = item.tag || '';
        const priority = item.priority || 'medium';

        modalBody.innerHTML = \`
          <div class="detail-header">
            <div class="detail-icon">💾</div>
            <div class="detail-meta-info">
              <div class="detail-title">Memory Snippet</div>
              <div class="detail-subtitle">
                \${sourceUrl ? '<a href="' + sourceUrl + '" target="_blank">' + escapeHtml(pageTitle) + '</a>' : 'No source URL'}
              </div>
            </div>
          </div>

          <div class="detail-text-full">\${escapeHtml(text)}</div>

          <div class="detail-stats">
            <span class="stat-item">📝 <strong>\${wordCount}</strong> words</span>
            <span class="stat-item">🔤 <strong>\${charCount}</strong> characters</span>
            <span class="stat-item">📅 Saved \${savedAt}</span>
            \${tag ? \`<span class="stat-item">🏷️ \${escapeHtml(tag)}</span>\` : ''}
            <span class="stat-item">⚡ Priority: \${priority}</span>
          </div>

          <div class="detail-actions">
            \${sourceUrl ? '<a href="' + sourceUrl + '" target="_blank" class="primary">🔗 Open Source</a>' : ''}
            <button onclick="copyToClipboard(decodeURIComponent('\${encodeURIComponent(text)}'))">📋 Copy Text</button>
          </div>

          <div class="task-section">
            <div class="task-header">
              <div class="task-header-content">
                <div class="task-icon">🤖</div>
                <div>
                  <h3 class="task-title">Create Task</h3>
                  <p class="task-subtitle">Turn this memory into an actionable task</p>
                </div>
              </div>
            </div>
            <form id="task-form" class="task-form" onsubmit="submitTask(event, '\${item.id}', 'memory')">
              <div class="task-input-wrapper">
                <textarea
                  id="task-input"
                  class="task-textarea"
                  placeholder="What do you want to do with this memory? Be specific..."
                  rows="4"
                ></textarea>
              </div>
              <div class="task-actions">
                <button type="submit" class="task-submit-btn">
                  <span class="btn-icon">📤</span>
                  <span>Create Task</span>
                </button>
                <span id="task-status" class="task-status"></span>
              </div>
            </form>
          </div>

          <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-secondary);">
            <span>🆔 ID: \${item.id}</span>
          </div>
        \`;

        window.currentItem = item;
      }

      function closeModal() {
        const modal = document.getElementById('memory-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.currentItem = null;
      }

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });

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
          status.className = 'task-status error';
          status.textContent = '⚠️ Please enter a task description';
          return;
        }

        status.className = 'task-status loading';
        status.textContent = '⏳ Creating task...';

        try {
          const item = window.currentItem;
          const context = item.context_json ? JSON.parse(item.context_json) : {};

          const payload = {
            task: task,
            source_item_id: itemId,
            source_item_type: itemType,
            source_text: item.text || '',
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
            status.className = 'task-status success';
            status.textContent = '✓ Task created successfully!';
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
                let webhookData = await webhookResponse.json();

                // Handle array responses (extract first element)
                if (Array.isArray(webhookData) && webhookData.length > 0) {
                  webhookData = webhookData[0];
                }

                // Save webhook response to task conversation thread
                if (webhookData && (webhookData.output || webhookData.message || webhookData.response || webhookData.data)) {
                  const responseText = webhookData.output || webhookData.message || webhookData.response || JSON.stringify(webhookData.data);

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
            status.className = 'task-status error';
            status.textContent = '❌ ' + (result.error || 'Unknown error');
          }
        } catch (error) {
          status.className = 'task-status error';
          status.textContent = '❌ Error: ' + error.message;
        }
      }

      async function exportMemories() {
        try {
          const response = await fetch(API_BASE + '/api/export/memories');
          if (!response.ok) throw new Error('Export failed');

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'memories-export-' + Date.now() + '.json';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();

          alert('✓ Memories exported successfully!');
        } catch (error) {
          alert('Failed to export: ' + error.message);
        }
      }

      // Initial load
      if (${count} > 0) {
        loadMemories();
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
