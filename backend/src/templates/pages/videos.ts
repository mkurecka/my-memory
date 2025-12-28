/**
 * Videos page - displays all saved YouTube videos
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface VideosPageProps {
  count: number;
  apiBase: string;
}

export function videosPage({ count, apiBase }: VideosPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/videos', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Saved Videos',
        subtitle: 'YouTube videos and video content',
        icon: '📹',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search videos..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Videos Grid -->
      <div id="videos-container">
        ${count === 0 ? emptyState({
          title: 'No Videos Saved',
          message: 'Visit YouTube and use the extension to save videos here.',
          icon: '📹',
          actionText: 'Go to YouTube',
          actionUrl: 'https://youtube.com'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>

    <!-- Video Detail Modal -->
    <div id="video-modal" class="modal" style="display: none;">
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

      .videos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .video-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
      }

      .video-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .video-thumbnail {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .video-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .video-thumbnail-placeholder {
        font-size: 4rem;
      }

      .video-play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .video-card:hover .video-play-overlay {
        opacity: 1;
      }

      .video-play-overlay::after {
        content: '';
        border-style: solid;
        border-width: 12px 0 12px 20px;
        border-color: transparent transparent transparent white;
        margin-left: 4px;
      }

      .video-content {
        padding: 1rem;
      }

      .video-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        margin-bottom: 0.5rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .video-channel {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
      }

      .video-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
      }

      .video-meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .video-link {
        color: #ff0000;
        text-decoration: none;
        font-weight: 500;
      }

      .video-link:hover {
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

      .video-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
        align-items: center;
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

      .detail-channel {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
      }

      .detail-channel a {
        color: var(--primary);
        text-decoration: none;
      }

      .detail-channel a:hover {
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
        background: #ff0000;
        color: white;
        border-color: #ff0000;
      }

      .detail-actions .primary:hover {
        background: #cc0000;
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

      .detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .detail-tag {
        background: var(--background);
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .transcript-unavailable {
        color: var(--text-secondary);
        font-style: italic;
        padding: 1rem;
        text-align: center;
        background: var(--background);
        border-radius: 8px;
      }

      .video-card {
        cursor: pointer;
      }

      @media (max-width: 768px) {
        .detail-header {
          flex-direction: column;
        }
        .detail-thumbnail {
          width: 100%;
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
      const perPage = 12;

      async function loadVideos() {
        const container = document.getElementById('videos-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=posts&type=youtube_video&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let videos = data.results;

            if (currentSort === 'oldest') {
              videos = videos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = videos.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString();
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const videoUrl = context.url || '';
              const channel = context.channel || {};
              const channelName = channel.name || channel.title || context.channelName || 'Unknown Channel';
              const thumbnail = context.thumbnail || '';
              const title = item.original_text || context.title || 'Untitled Video';

              // Extract video ID for YouTube thumbnail fallback
              let videoId = context.videoId || '';
              if (!videoId && videoUrl) {
                const match = videoUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
                if (match) videoId = match[1];
              }
              const thumbUrl = thumbnail || (videoId ? 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg' : '');

              return \`
                <div class="video-card" data-id="\${item.id}" onclick="openModal(\${JSON.stringify(item).replace(/"/g, '&quot;')})">
                  <div class="video-thumbnail">
                    \${thumbUrl
                      ? '<img src="' + thumbUrl + '" alt="' + escapeHtml(title) + '" loading="lazy" />'
                      : '<span class="video-thumbnail-placeholder">📹</span>'
                    }
                    <div class="video-play-overlay"></div>
                  </div>
                  <div class="video-content">
                    <h3 class="video-title">\${escapeHtml(title)}</h3>
                    <div class="video-channel">
                      <span>📺</span>
                      <span>\${escapeHtml(channelName)}</span>
                    </div>
                    <div class="video-meta">
                      <span class="video-meta-item">📅 Saved \${dateStr}</span>
                      \${videoUrl ? \`<a href="\${videoUrl}" target="_blank" class="video-link video-meta-item">🔗 Watch</a>\` : ''}
                      <button class="delete-btn" onclick="deleteVideo('\${item.id}', this)" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="videos-grid">' + html + '</div>';
            updatePagination(data.total || videos.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No videos found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load videos:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load videos</p></div>';
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
        loadVideos();
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
        loadVideos();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadVideos();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deleteVideo(id, btn) {
        if (!confirm('Delete this video?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const response = await fetch(API_BASE + '/api/search/post/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.video-card');
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
        const modal = document.getElementById('video-modal');
        const modalBody = document.getElementById('modal-body');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const context = item.context_json ? JSON.parse(item.context_json) : {};
        const videoUrl = context.url || '';
        const channel = context.channel || {};
        const channelName = channel.name || channel.title || context.channelName || 'Unknown Channel';
        const channelUrl = channel.url || '';
        const thumbnail = context.thumbnail || context.thumbnails?.high || context.thumbnails?.medium || '';
        const title = item.original_text || context.title || 'Untitled Video';
        const description = context.description || '';
        const duration = context.duration?.formatted || context.duration || '';
        const stats = context.statistics || {};
        const tags = context.tags || [];
        const transcript = context.transcript || {};
        const publishedAt = context.publishedAt ? new Date(context.publishedAt).toLocaleDateString() : '';
        const savedAt = new Date(item.created_at).toLocaleDateString();

        let videoId = context.videoId || '';
        if (!videoId && videoUrl) {
          const match = videoUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
          if (match) videoId = match[1];
        }
        const thumbUrl = thumbnail || (videoId ? 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg' : '');

        modalBody.innerHTML = \`
          <div class="detail-header">
            <div class="detail-thumbnail">
              \${thumbUrl ? '<img src="' + thumbUrl + '" alt="' + escapeHtml(title) + '" />' : '<div style="height:180px;display:flex;align-items:center;justify-content:center;font-size:4rem;">📹</div>'}
            </div>
            <div class="detail-info">
              <h2 class="detail-title">\${escapeHtml(title)}</h2>
              <div class="detail-channel">
                <span>📺</span>
                \${channelUrl ? '<a href="' + channelUrl + '" target="_blank">' + escapeHtml(channelName) + '</a>' : '<span>' + escapeHtml(channelName) + '</span>'}
              </div>
              <div class="detail-stats">
                \${duration ? '<span class="stat-item">⏱️ ' + duration + '</span>' : ''}
                \${stats.viewsFormatted ? '<span class="stat-item">👁️ ' + stats.viewsFormatted + ' views</span>' : ''}
                \${stats.likesFormatted ? '<span class="stat-item">👍 ' + stats.likesFormatted + '</span>' : ''}
                \${stats.commentsFormatted ? '<span class="stat-item">💬 ' + stats.commentsFormatted + '</span>' : ''}
                \${publishedAt ? '<span class="stat-item">📅 Published ' + publishedAt + '</span>' : ''}
              </div>
              <div class="detail-actions">
                \${videoUrl ? '<a href="' + videoUrl + '" target="_blank" class="primary">▶️ Watch on YouTube</a>' : ''}
                <button onclick="copyToClipboard('\${escapeHtml(title)}')">📋 Copy Title</button>
              </div>
            </div>
          </div>

          \${description ? \`
            <div class="detail-section">
              <h3 class="detail-section-title">📝 Description</h3>
              <div class="detail-description">\${escapeHtml(description)}</div>
            </div>
          \` : ''}

          <div class="detail-section">
            <h3 class="detail-section-title">📜 Transcript \${transcript.available && transcript.text ? '(' + (transcript.wordCount || 0) + ' words)' : ''}</h3>
            <div id="transcript-container">
              \${transcript.available && transcript.text ? \`
                <div class="detail-transcript">\${escapeHtml(transcript.text)}</div>
              \` : \`
                <div class="transcript-unavailable">
                  <p>No transcript loaded</p>
                  <button onclick="fetchTranscript('\${videoId}')" style="margin-top:0.75rem;background:var(--primary);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;">
                    📥 Fetch Transcript from YouTube
                  </button>
                </div>
              \`}
            </div>
          </div>

          \${tags.length > 0 ? \`
            <div class="detail-section">
              <h3 class="detail-section-title">🏷️ Tags</h3>
              <div class="detail-tags">
                \${tags.slice(0, 20).map(tag => '<span class="detail-tag">' + escapeHtml(tag) + '</span>').join('')}
                \${tags.length > 20 ? '<span class="detail-tag">+' + (tags.length - 20) + ' more</span>' : ''}
              </div>
            </div>
          \` : ''}

          <div class="detail-section">
            <h3 class="detail-section-title">🤖 Create Task from Video</h3>
            <form id="task-form" onsubmit="submitTask(event, '\${item.id}', 'video')">
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

        // Store current item for task submission
        window.currentItem = item;
      }

      function closeModal() {
        const modal = document.getElementById('video-modal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        window.currentItem = null;
      }

      // Close modal on Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });

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

            // Update the section title with word count
            const title = container.parentElement.querySelector('.detail-section-title');
            if (title) {
              title.innerHTML = '📜 Transcript (' + (transcript.wordCount || 0) + ' words)';
            }

            // Update the stored item with transcript
            if (window.currentItem) {
              const context = window.currentItem.context_json ? JSON.parse(window.currentItem.context_json) : {};
              context.transcript = transcript;
              context.description = result.data.description || context.description;
              context.statistics = result.data.statistics || context.statistics;
              context.tags = result.data.tags || context.tags;
              window.currentItem.context_json = JSON.stringify(context);
            }
          } else {
            container.innerHTML = '<div class="transcript-unavailable"><p>No transcript available for this video</p><p style="font-size:0.8rem;margin-top:0.5rem;">' + (result.data?.transcript?.error || result.error || 'Transcript not found') + '</p></div>';
          }
        } catch (error) {
          container.innerHTML = '<div class="transcript-unavailable"><p>Failed to fetch transcript</p><p style="font-size:0.8rem;margin-top:0.5rem;">' + error.message + '</p></div>';
        }
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
            task: task,
            source_item_id: itemId,
            source_item_type: itemType,
            source_text: item.original_text || context.title || '',
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

            // Still send webhook for backward compatibility
            fetch(API_BASE + '/api/v1/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'memory_task',
                data: { ...payload, task_id: result.task_id, is_new: true }
              })
            }).catch(console.error);
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
        loadVideos();
      }
    </script>
  `;

  return baseLayout({
    title: 'Videos - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
