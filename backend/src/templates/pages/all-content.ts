/**
 * All Content page - unified viewer for all saved content
 * Displays memories, tweets, videos, AI content, AI images in one place
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';
import { skeletonGrid, skeletonStyles } from '../components/skeleton';

export interface AllContentPageProps {
  totalCount: number;
  counts: {
    memories: number;
    tweets: number;
    videos: number;
    aiContent: number;
  };
  apiBase: string;
}

export function allContentPage({ totalCount, counts, apiBase }: AllContentPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/all-content', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'All Content',
        subtitle: 'View and manage all your saved content in one place',
        icon: '📚',
        count: totalCount,
        backLink: '/dashboard'
      })}

      <!-- Filter Stats Bar -->
      <div class="filter-stats">
        <button class="stat-chip active" data-filter="all">
          <span class="chip-label">All</span>
          <span class="chip-count">${totalCount}</span>
        </button>
        <button class="stat-chip" data-filter="memory">
          <span class="chip-icon">🧠</span>
          <span class="chip-label">Memories</span>
          <span class="chip-count">${counts.memories}</span>
        </button>
        <button class="stat-chip" data-filter="tweet">
          <span class="chip-icon">🐦</span>
          <span class="chip-label">Tweets</span>
          <span class="chip-count">${counts.tweets}</span>
        </button>
        <button class="stat-chip" data-filter="youtube_video">
          <span class="chip-icon">📹</span>
          <span class="chip-label">Videos</span>
          <span class="chip-count">${counts.videos}</span>
        </button>
        <button class="stat-chip" data-filter="ai_content">
          <span class="chip-icon">✨</span>
          <span class="chip-label">AI Content</span>
          <span class="chip-count">${counts.aiContent}</span>
        </button>
      </div>

      <!-- Search and Sort Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search across all content..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="date-filter">
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range...</option>
          </select>
          <select id="sort-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="exportAllContent()">
            📥 Export All
          </button>
        </div>
      </div>

      <!-- Content List -->
      <div id="content-container">
        ${totalCount === 0 ? emptyState({
          title: 'No Content Yet',
          message: 'Start saving memories, tweets, or generating AI content to see them here.',
          icon: '📚',
          actionText: 'Add Content',
          actionUrl: '/dashboard/add'
        }) : skeletonGrid(6)}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  const styles = `
    <style>
      ${skeletonStyles}

      .filter-stats {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        background: var(--surface);
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid var(--border);
      }

      .stat-chip {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 99px;
        background: var(--background);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .stat-chip:hover {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .stat-chip.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .stat-chip.active .chip-count {
        background: rgba(255, 255, 255, 0.2);
      }

      .chip-icon {
        font-size: 1rem;
      }

      .chip-label {
        font-weight: 500;
      }

      .chip-count {
        background: var(--background);
        padding: 0.125rem 0.5rem;
        border-radius: 99px;
        font-size: 0.75rem;
        font-weight: 600;
        min-width: 24px;
        text-align: center;
      }

      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .search-box {
        position: relative;
        flex: 1;
        min-width: 250px;
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

      .content-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .content-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border);
        transition: all 0.2s;
      }

      .content-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .content-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }

      .content-type-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .type-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        text-transform: uppercase;
      }

      .type-badge.memory { background: #dbeafe; color: #1e40af; }
      .type-badge.tweet { background: #dbeafe; color: #1d4ed8; }
      .type-badge.youtube_video { background: #fee2e2; color: #b91c1c; }
      .type-badge.ai_content { background: #d1fae5; color: #059669; }

      .content-date {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .content-body {
        padding: 1.25rem;
      }

      .content-preview {
        font-size: 0.95rem;
        color: var(--text-primary);
        line-height: 1.6;
        margin-bottom: 1rem;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .content-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding-top: 1rem;
        margin-top: 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .content-actions {
        display: flex;
        gap: 0.5rem;
      }

      .action-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text-primary);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background: var(--primary-light);
        border-color: var(--primary);
        color: var(--primary);
      }

      .action-btn.delete {
        color: #dc2626;
      }

      .action-btn.delete:hover {
        background: #fee2e2;
        border-color: #dc2626;
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

      @media (max-width: 768px) {
        .filter-stats {
          padding: 0.75rem;
          gap: 0.5rem;
        }

        .stat-chip {
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
        }

        .toolbar {
          flex-direction: column;
        }

        .search-box {
          min-width: 100%;
        }

        .toolbar-actions {
          flex-direction: column;
        }

        .toolbar-actions select {
          width: 100%;
        }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentFilter = 'all';
      let currentSearch = '';
      let currentSort = 'newest';
      let currentDateFilter = '';
      const perPage = 20;

      async function loadContent() {
        const container = document.getElementById('content-container');
        container.innerHTML = \`${skeletonGrid(6)}\`;

        try {
          // Fetch from both tables based on filter
          let allContent = [];

          if (currentFilter === 'all' || currentFilter === 'memory') {
            const memoryUrl = API_BASE + '/api/search/recent?table=memory&limit=100';
            const memoryResp = await fetch(memoryUrl);
            const memoryData = await memoryResp.json();
            if (memoryData.success && memoryData.results) {
              allContent = allContent.concat(memoryData.results.map(item => ({
                ...item,
                contentType: 'memory',
                displayText: item.text
              })));
            }
          }

          if (currentFilter === 'all' || ['tweet', 'youtube_video', 'ai_content'].includes(currentFilter)) {
            let postsUrl = API_BASE + '/api/search/recent?table=posts&limit=100';
            if (currentFilter === 'ai_content') {
              postsUrl += '&hasGenerated=true';
            } else if (currentFilter !== 'all') {
              postsUrl += '&type=' + encodeURIComponent(currentFilter);
            }

            const postsResp = await fetch(postsUrl);
            const postsData = await postsResp.json();
            if (postsData.success && postsData.results) {
              allContent = allContent.concat(postsData.results.map(item => ({
                ...item,
                contentType: item.generated_output ? 'ai_content' : (item.type || 'post'),
                displayText: item.generated_output || item.original_text
              })));
            }
          }

          // Apply search filter
          if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            allContent = allContent.filter(item =>
              (item.displayText && item.displayText.toLowerCase().includes(searchLower)) ||
              (item.original_text && item.original_text.toLowerCase().includes(searchLower))
            );
          }

          // Sort
          if (currentSort === 'newest') {
            allContent.sort((a, b) => b.created_at - a.created_at);
          } else {
            allContent.sort((a, b) => a.created_at - b.created_at);
          }

          // Pagination
          const startIdx = (currentPage - 1) * perPage;
          const endIdx = startIdx + perPage;
          const pageContent = allContent.slice(startIdx, endIdx);

          if (pageContent.length > 0) {
            const html = pageContent.map((item, index) => renderContentCard(item, index)).join('');
            container.innerHTML = '<div class="content-grid">' + html + '</div>';
            updatePagination(allContent.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No content found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }

        } catch (error) {
          console.error('Failed to load content:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load content</p></div>';
        }
      }

      function renderContentCard(item, index) {
        const date = new Date(item.created_at);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const uniqueId = 'content-' + index + '-' + Date.now();

        const typeLabel = {
          'memory': '🧠 Memory',
          'tweet': '🐦 Tweet',
          'youtube_video': '📹 Video',
          'ai_content': '✨ AI Content'
        }[item.contentType] || '📄 Post';

        const typeClass = item.contentType;
        const displayText = (item.displayText || '').substring(0, 300);

        let metaItems = \`<span class="meta-item">📅 \${dateStr}</span>\`;
        if (item.context_json) {
          try {
            const context = JSON.parse(item.context_json);
            if (context.author) metaItems += \`<span class="meta-item">👤 \${escapeHtml(context.author)}</span>\`;
            if (context.url) metaItems += \`<span class="meta-item">🔗 <a href="\${context.url}" target="_blank">Source</a></span>\`;
          } catch (e) {}
        }

        const deleteEndpoint = item.contentType === 'memory' ? 'memory' : 'post';

        return \`
          <div class="content-card" data-id="\${item.id}">
            <div class="content-card-header">
              <div class="content-type-badge">
                <span class="type-badge \${typeClass}">\${typeLabel}</span>
              </div>
              <span class="content-date">\${dateStr}</span>
            </div>
            <div class="content-body">
              <div class="content-preview">\${escapeHtml(displayText)}</div>
              <div class="content-meta">
                \${metaItems}
              </div>
              <div class="content-actions">
                <button class="action-btn delete" onclick="deleteContent('\${deleteEndpoint}', '\${item.id}', this)">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        \`;
      }

      async function deleteContent(endpoint, id, button) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
          button.disabled = true;
          button.textContent = 'Deleting...';

          const response = await fetch(API_BASE + '/api/search/' + endpoint + '/' + id, {
            method: 'DELETE'
          });

          const data = await response.json();
          if (data.success) {
            loadContent(); // Reload
          } else {
            alert('Failed to delete: ' + data.error);
            button.disabled = false;
            button.textContent = '🗑️ Delete';
          }
        } catch (error) {
          console.error('Delete error:', error);
          alert('Failed to delete');
          button.disabled = false;
          button.textContent = '🗑️ Delete';
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
        loadContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Event listeners
      document.querySelectorAll('.stat-chip').forEach(chip => {
        chip.addEventListener('click', function() {
          document.querySelectorAll('.stat-chip').forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          currentFilter = this.dataset.filter;
          currentPage = 1;
          loadContent();
        });
      });

      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value;
        currentPage = 1;
        loadContent();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadContent();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function exportAllContent() {
        try {
          const response = await fetch(API_BASE + '/api/export/all');
          if (!response.ok) throw new Error('Export failed');

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'full-export-' + Date.now() + '.json';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();

          alert('✓ All content exported successfully!');
        } catch (error) {
          alert('Failed to export: ' + error.message);
        }
      }

      // Initial load
      if (${totalCount} > 0) {
        loadContent();
      }
    </script>
  `;

  return baseLayout({
    title: 'All Content - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
