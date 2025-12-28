/**
 * Claude Sessions page - displays Claude Code / AI coding sessions
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface ClaudeSessionsPageProps {
  count: number;
  apiBase: string;
}

export function claudeSessionsPage({ count, apiBase }: ClaudeSessionsPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/claude-sessions', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Claude Sessions',
        subtitle: 'AI coding session history and summaries',
        icon: '🤖',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search sessions..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="status-filter">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Sessions List -->
      <div id="sessions-container">
        ${count === 0 ? emptyState({
          title: 'No Sessions Yet',
          message: 'Claude Code sessions will appear here when you start logging them.',
          icon: '🤖'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Session Detail Modal -->
      <div id="session-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Session Details</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div id="modal-body" class="modal-body">
            <div class="loading-container"><div class="loading"></div></div>
          </div>
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

      .sessions-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .session-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem;
        transition: all 0.2s;
        cursor: pointer;
      }

      .session-card:hover {
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }

      .session-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
      }

      .session-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .session-status {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-active {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .status-completed {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-cancelled {
        background: #fee2e2;
        color: #dc2626;
      }

      .session-summary {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 1rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .session-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .meta-icon {
        font-size: 0.9rem;
      }

      .session-id {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .session-id code {
        background: var(--background);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.7rem;
      }

      .session-project {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: var(--background);
        border-radius: 6px;
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-family: monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .session-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
      }

      .btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text-primary);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn:hover {
        background: var(--background);
      }

      .btn-danger {
        color: #dc2626;
        border-color: #fecaca;
      }

      .btn-danger:hover {
        background: #fee2e2;
      }

      /* Modal */
      .modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        padding: 1rem;
      }

      .modal.active {
        display: flex;
      }

      .modal-content {
        background: var(--surface);
        border-radius: 12px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 0.25rem;
        line-height: 1;
      }

      .modal-close:hover {
        color: var(--text-primary);
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
      }

      .messages-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .message {
        padding: 1rem;
        border-radius: 8px;
        background: var(--background);
      }

      .message-user {
        background: #dbeafe;
        margin-left: 2rem;
      }

      .message-assistant {
        background: #f3f4f6;
        margin-right: 2rem;
      }

      .message-role {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
      }

      .message-content {
        font-size: 0.9rem;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      .session-detail-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--background);
        border-radius: 8px;
      }

      .detail-item {
        text-align: center;
      }

      .detail-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary);
      }

      .detail-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .loading {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let allSessions = [];
      let currentSession = null;

      // Load sessions on page load
      document.addEventListener('DOMContentLoaded', loadSessions);

      // Search functionality
      document.getElementById('search-input').addEventListener('input', filterSessions);
      document.getElementById('status-filter').addEventListener('change', filterSessions);
      document.getElementById('sort-select').addEventListener('change', filterSessions);

      async function loadSessions() {
        const container = document.getElementById('sessions-container');
        
        try {
          const response = await fetch(API_BASE + '/api/claude/sessions?limit=100');
          const data = await response.json();
          
          if (data.success) {
            allSessions = data.sessions || [];
            renderSessions(allSessions);
          } else {
            container.innerHTML = '<div class="no-results">Failed to load sessions</div>';
          }
        } catch (error) {
          console.error('Error loading sessions:', error);
          container.innerHTML = '<div class="no-results">Error loading sessions</div>';
        }
      }

      function filterSessions() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;
        const sortOrder = document.getElementById('sort-select').value;

        let filtered = allSessions.filter(session => {
          const matchesSearch = !searchTerm || 
            (session.title && session.title.toLowerCase().includes(searchTerm)) ||
            (session.summary && session.summary.toLowerCase().includes(searchTerm)) ||
            (session.project_path && session.project_path.toLowerCase().includes(searchTerm));
          
          const matchesStatus = !statusFilter || session.status === statusFilter;
          
          return matchesSearch && matchesStatus;
        });

        // Sort
        filtered.sort((a, b) => {
          const dateA = a.created_at || 0;
          const dateB = b.created_at || 0;
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        renderSessions(filtered);
      }

      function renderSessions(sessions) {
        const container = document.getElementById('sessions-container');
        
        if (sessions.length === 0) {
          container.innerHTML = '<div class="no-results">No sessions found</div>';
          return;
        }

        container.innerHTML = '<div class="sessions-list">' + 
          sessions.map(session => renderSessionCard(session)).join('') +
          '</div>';
      }

      function renderSessionCard(session) {
        const statusClass = 'status-' + (session.status || 'active');
        const date = session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Unknown';
        
        const duration = session.duration_seconds 
          ? formatDuration(session.duration_seconds)
          : '-';

        return \`
          <div class="session-card" onclick="viewSession('\${session.id}')">
            <div class="session-header">
              <h3 class="session-title">\${session.title || 'Untitled Session'}</h3>
              <span class="session-status \${statusClass}">\${session.status || 'active'}</span>
            </div>
            
            \${session.session_id ? \`
              <div class="session-id">
                <span>🔑</span>
                <code>\${session.session_id}</code>
              </div>
            \` : ''}
            
            \${session.project_path ? \`
              <div class="session-project">
                <span>📁</span>
                <span>\${session.project_path}</span>
              </div>
            \` : ''}
            
            \${session.summary ? \`
              <p class="session-summary">\${session.summary}</p>
            \` : ''}
            
            <div class="session-meta">
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                <span>\${date}</span>
              </span>
              <span class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span>\${duration}</span>
              </span>
              <span class="meta-item">
                <span class="meta-icon">💬</span>
                <span>\${session.total_messages || 0} messages</span>
              </span>
              <span class="meta-item">
                <span class="meta-icon">🔤</span>
                <span>\${(session.total_tokens || 0).toLocaleString()} tokens</span>
              </span>
              \${session.model ? \`
                <span class="meta-item">
                  <span class="meta-icon">🤖</span>
                  <span>\${session.model.split('/').pop()}</span>
                </span>
              \` : ''}
            </div>
            
            <div class="session-actions" onclick="event.stopPropagation()">
              <button class="btn" onclick="viewSession('\${session.id}')">View Details</button>
              <button class="btn btn-danger" onclick="deleteSession('\${session.id}')">Delete</button>
            </div>
          </div>
        \`;
      }

      function formatDuration(seconds) {
        if (seconds < 60) return seconds + 's';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return hours + 'h ' + mins + 'm';
      }

      async function viewSession(id) {
        const modal = document.getElementById('session-modal');
        const modalBody = document.getElementById('modal-body');
        const modalTitle = document.getElementById('modal-title');
        
        modal.classList.add('active');
        modalBody.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/claude/sessions/' + id);
          const data = await response.json();
          
          if (data.success) {
            currentSession = data.session;
            modalTitle.textContent = data.session.title || 'Session Details';
            modalBody.innerHTML = renderSessionDetail(data.session, data.messages);
          } else {
            modalBody.innerHTML = '<div class="no-results">Failed to load session</div>';
          }
        } catch (error) {
          console.error('Error loading session:', error);
          modalBody.innerHTML = '<div class="no-results">Error loading session</div>';
        }
      }

      function renderSessionDetail(session, messages) {
        const duration = session.duration_seconds 
          ? formatDuration(session.duration_seconds)
          : '-';

        return \`
          <div class="session-detail-meta">
            <div class="detail-item">
              <div class="detail-value">\${session.total_messages || 0}</div>
              <div class="detail-label">Messages</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${(session.total_tokens || 0).toLocaleString()}</div>
              <div class="detail-label">Tokens</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${duration}</div>
              <div class="detail-label">Duration</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${session.status || 'active'}</div>
              <div class="detail-label">Status</div>
            </div>
          </div>

          \${session.summary ? \`
            <div style="margin-bottom: 1.5rem;">
              <strong>Summary:</strong>
              <p style="margin-top: 0.5rem; color: var(--text-secondary);">\${session.summary}</p>
            </div>
          \` : ''}

          \${session.project_path ? \`
            <div style="margin-bottom: 1.5rem;">
              <strong>Project:</strong>
              <code style="display: block; margin-top: 0.5rem; padding: 0.5rem; background: var(--background); border-radius: 4px;">\${session.project_path}</code>
            </div>
          \` : ''}

          <h3 style="margin-bottom: 1rem;">Messages (\${messages.length})</h3>
          <div class="messages-list">
            \${messages.length > 0 
              ? messages.map(msg => \`
                  <div class="message message-\${msg.role}">
                    <div class="message-role">\${msg.role}</div>
                    <div class="message-content">\${escapeHtml(msg.content)}</div>
                  </div>
                \`).join('')
              : '<div class="no-results">No messages recorded</div>'
            }
          </div>
        \`;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function closeModal() {
        document.getElementById('session-modal').classList.remove('active');
        currentSession = null;
      }

      // Close modal on outside click
      document.getElementById('session-modal').addEventListener('click', (e) => {
        if (e.target.id === 'session-modal') closeModal();
      });

      // Close modal on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });

      async function deleteSession(id) {
        if (!confirm('Delete this session and all its messages?')) return;

        try {
          const response = await fetch(API_BASE + '/api/claude/sessions/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();
          
          if (data.success) {
            loadSessions();
            closeModal();
          } else {
            alert('Failed to delete: ' + data.error);
          }
        } catch (error) {
          console.error('Error deleting session:', error);
          alert('Error deleting session');
        }
      }
    </script>
  `;

  return baseLayout({
    title: 'Claude Sessions - My Memory 🧠',
    content: content + styles + scripts
  });
}
