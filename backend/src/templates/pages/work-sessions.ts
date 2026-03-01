/**
 * Work Sessions page - displays coding work session history and summaries
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface WorkSessionsPageProps {
  count: number;
  apiBase: string;
}

export function workSessionsPage({ count, apiBase }: WorkSessionsPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/work-sessions', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Work Sessions',
        subtitle: 'Coding session history, changes, and progress tracking',
        icon: '📝',
        count,
        backLink: '/dashboard'
      })}

      <!-- Stats Bar -->
      <div id="stats-bar" class="stats-bar">
        <div class="stat-item">
          <span class="stat-value" id="stat-total">-</span>
          <span class="stat-label">Total Sessions</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-projects">-</span>
          <span class="stat-label">Projects</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-last">-</span>
          <span class="stat-label">Last Session</span>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search sessions (semantic)..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="project-filter">
            <option value="">All Projects</option>
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
          title: 'No Work Sessions Yet',
          message: 'Work sessions will appear here when you start logging them via MCP or the API.',
          icon: '📝'
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
      .stats-bar {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding: 1rem 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary);
      }

      .stat-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
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

      .session-goal {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        flex: 1;
      }

      .project-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        font-size: 0.75rem;
        font-weight: 600;
        background: #dbeafe;
        color: #1d4ed8;
        white-space: nowrap;
      }

      .verified-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-radius: 99px;
        font-size: 0.7rem;
        font-weight: 600;
        background: #dcfce7;
        color: #16a34a;
        margin-left: 0.5rem;
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

      .session-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .tag {
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.75rem;
        background: var(--background);
        color: var(--text-secondary);
        border: 1px solid var(--border);
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

      .jira-link {
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
      }

      .jira-link:hover {
        text-decoration: underline;
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

      .detail-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--primary);
      }

      .detail-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .detail-section {
        margin-bottom: 1.5rem;
      }

      .detail-section h3 {
        font-size: 1rem;
        margin-bottom: 0.75rem;
        color: var(--text-primary);
      }

      .detail-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .detail-list li {
        padding: 0.5rem 0.75rem;
        background: var(--background);
        border-radius: 6px;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      .detail-list li.error-item {
        background: #fef2f2;
        color: #991b1b;
        border-left: 3px solid #dc2626;
      }

      .detail-list li.open-item {
        background: #fffbeb;
        color: #92400e;
        border-left: 3px solid #f59e0b;
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

      @media (max-width: 768px) {
        .stats-bar {
          flex-direction: row;
          justify-content: space-around;
        }
        .stat-value {
          font-size: 1.25rem;
        }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let allSessions = [];
      let allProjects = [];
      let searchTimeout = null;

      document.addEventListener('DOMContentLoaded', () => {
        loadProjects();
        loadSessions();
      });

      document.getElementById('search-input').addEventListener('input', handleSearch);
      document.getElementById('project-filter').addEventListener('change', loadSessions);
      document.getElementById('sort-select').addEventListener('change', sortAndRender);

      function handleSearch() {
        clearTimeout(searchTimeout);
        const query = document.getElementById('search-input').value.trim();
        if (query.length >= 2) {
          searchTimeout = setTimeout(() => searchSessions(query), 400);
        } else if (query.length === 0) {
          loadSessions();
        }
      }

      async function loadProjects() {
        try {
          const response = await fetch(API_BASE + '/api/work-sessions/projects');
          const data = await response.json();
          if (data.success && data.projects) {
            allProjects = data.projects;
            const select = document.getElementById('project-filter');
            data.projects.forEach(p => {
              const opt = document.createElement('option');
              opt.value = p.project;
              opt.textContent = p.project + ' (' + p.session_count + ')';
              select.appendChild(opt);
            });
            // Update stats
            document.getElementById('stat-projects').textContent = data.projects.length;
            if (data.projects.length > 0) {
              const lastDate = new Date(data.projects[0].last_session);
              document.getElementById('stat-last').textContent = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        } catch (error) {
          console.error('Error loading projects:', error);
        }
      }

      async function loadSessions() {
        const container = document.getElementById('sessions-container');
        const project = document.getElementById('project-filter').value;

        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          let url = API_BASE + '/api/work-sessions?limit=100';
          if (project) url += '&project=' + encodeURIComponent(project);

          const response = await fetch(url);
          const data = await response.json();

          if (data.success) {
            allSessions = data.sessions || [];
            document.getElementById('stat-total').textContent = allSessions.length;
            sortAndRender();
          } else {
            container.innerHTML = '<div class="no-results">Failed to load sessions</div>';
          }
        } catch (error) {
          console.error('Error loading sessions:', error);
          container.innerHTML = '<div class="no-results">Error loading sessions</div>';
        }
      }

      async function searchSessions(query) {
        const container = document.getElementById('sessions-container');
        const project = document.getElementById('project-filter').value;

        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const body = { query, limit: 50 };
          if (project) body.project = project;

          const response = await fetch(API_BASE + '/api/work-sessions/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await response.json();

          if (data.success) {
            allSessions = data.sessions || [];
            renderSessions(allSessions);
          } else {
            container.innerHTML = '<div class="no-results">Search failed</div>';
          }
        } catch (error) {
          console.error('Error searching sessions:', error);
          container.innerHTML = '<div class="no-results">Error searching sessions</div>';
        }
      }

      function sortAndRender() {
        const sortOrder = document.getElementById('sort-select').value;
        const sorted = [...allSessions].sort((a, b) => {
          const dateA = a.created_at || 0;
          const dateB = b.created_at || 0;
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        renderSessions(sorted);
      }

      function renderSessions(sessions) {
        const container = document.getElementById('sessions-container');

        if (sessions.length === 0) {
          container.innerHTML = '<div class="no-results">No sessions found</div>';
          return;
        }

        container.innerHTML = '<div class="sessions-list">' +
          sessions.map(s => renderSessionCard(s)).join('') +
          '</div>';
      }

      function renderSessionCard(session) {
        const date = session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Unknown';

        const tags = (session.tags || []);
        const changes = (session.changes || []);
        const errors = (session.errors || []);

        return \`
          <div class="session-card" onclick="viewSession('\${session.id}')">
            <div class="session-header">
              <h3 class="session-goal">\${escapeHtml(session.goal)}</h3>
              <div>
                <span class="project-badge">\${escapeHtml(session.project)}</span>
                \${session.verified ? '<span class="verified-badge">Verified</span>' : ''}
              </div>
            </div>

            \${session.summary ? \`
              <p class="session-summary">\${escapeHtml(session.summary)}</p>
            \` : ''}

            \${tags.length > 0 ? \`
              <div class="session-tags">
                \${tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('')}
              </div>
            \` : ''}

            <div class="session-meta">
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                <span>\${date}</span>
              </span>
              <span class="meta-item">
                <span class="meta-icon">📝</span>
                <span>\${changes.length} change\${changes.length !== 1 ? 's' : ''}</span>
              </span>
              \${errors.length > 0 ? \`
                <span class="meta-item">
                  <span class="meta-icon">⚠️</span>
                  <span>\${errors.length} error\${errors.length !== 1 ? 's' : ''}</span>
                </span>
              \` : ''}
              \${session.jira_ref ? \`
                <span class="meta-item" onclick="event.stopPropagation()">
                  <span class="meta-icon">🔗</span>
                  <a class="jira-link" href="https://linear.app/mkurecka/issue/\${encodeURIComponent(session.jira_ref)}" target="_blank">\${escapeHtml(session.jira_ref)}</a>
                </span>
              \` : ''}
            </div>
          </div>
        \`;
      }

      async function viewSession(id) {
        const modal = document.getElementById('session-modal');
        const modalBody = document.getElementById('modal-body');
        const modalTitle = document.getElementById('modal-title');

        modal.classList.add('active');
        modalBody.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/work-sessions/' + id);
          const data = await response.json();

          if (data.success !== false && data.id) {
            modalTitle.textContent = data.project + ' - Session Details';
            modalBody.innerHTML = renderSessionDetail(data);
          } else {
            modalBody.innerHTML = '<div class="no-results">Failed to load session</div>';
          }
        } catch (error) {
          console.error('Error loading session:', error);
          modalBody.innerHTML = '<div class="no-results">Error loading session</div>';
        }
      }

      function renderSessionDetail(session) {
        const date = session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Unknown';

        const changes = session.changes || [];
        const errors = session.errors || [];
        const openItems = session.open_items || [];
        const tags = session.tags || [];

        return \`
          <div class="detail-meta">
            <div class="detail-item">
              <div class="detail-value">\${escapeHtml(session.project)}</div>
              <div class="detail-label">Project</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${changes.length}</div>
              <div class="detail-label">Changes</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${errors.length}</div>
              <div class="detail-label">Errors</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">\${session.verified ? 'Yes' : 'No'}</div>
              <div class="detail-label">Verified</div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Goal</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">\${escapeHtml(session.goal)}</p>
          </div>

          \${session.summary ? \`
            <div class="detail-section">
              <h3>Summary</h3>
              <p style="color: var(--text-secondary); line-height: 1.6;">\${escapeHtml(session.summary)}</p>
            </div>
          \` : ''}

          <div style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
            <strong>Date:</strong> \${date}
            \${session.jira_ref ? \` | <strong>Ref:</strong> <a class="jira-link" href="https://linear.app/mkurecka/issue/\${encodeURIComponent(session.jira_ref)}" target="_blank">\${escapeHtml(session.jira_ref)}</a>\` : ''}
          </div>

          \${tags.length > 0 ? \`
            <div class="detail-section">
              <h3>Tags</h3>
              <div class="session-tags">
                \${tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('')}
              </div>
            </div>
          \` : ''}

          \${changes.length > 0 ? \`
            <div class="detail-section">
              <h3>Changes (\${changes.length})</h3>
              <ul class="detail-list">
                \${changes.map(ch => '<li>' + escapeHtml(ch) + '</li>').join('')}
              </ul>
            </div>
          \` : ''}

          \${errors.length > 0 ? \`
            <div class="detail-section">
              <h3>Errors (\${errors.length})</h3>
              <ul class="detail-list">
                \${errors.map(e => '<li class="error-item">' + escapeHtml(e) + '</li>').join('')}
              </ul>
            </div>
          \` : ''}

          \${openItems.length > 0 ? \`
            <div class="detail-section">
              <h3>Open Items (\${openItems.length})</h3>
              <ul class="detail-list">
                \${openItems.map(oi => '<li class="open-item">' + escapeHtml(oi) + '</li>').join('')}
              </ul>
            </div>
          \` : ''}
        \`;
      }

      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function closeModal() {
        document.getElementById('session-modal').classList.remove('active');
      }

      document.getElementById('session-modal').addEventListener('click', (e) => {
        if (e.target.id === 'session-modal') closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    </script>
  `;

  return baseLayout({
    title: 'Work Sessions - My Memory 🧠',
    content: content + styles + scripts
  });
}
