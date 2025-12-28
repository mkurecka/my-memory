/**
 * Profiles page - displays ALL Airtable tables dynamically
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface ProfilesPageProps {
  profilesCount: number;
  websitesCount: number;
  apiBase: string;
  configured: boolean;
  airtableBaseId?: string;
}

export function profilesPage({ apiBase, configured, airtableBaseId }: ProfilesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/profiles', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Airtable Data',
        subtitle: 'All tables from your Airtable base',
        icon: '📊',
        count: 0,
        backLink: '/dashboard'
      })}

      ${!configured ? `
        <div class="config-warning">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <strong>Airtable Not Configured</strong>
            <p>Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables to enable this feature.</p>
          </div>
        </div>
      ` : ''}

      <!-- Dynamic Tabs Container -->
      <div id="tabs-container" class="tabs">
        <div class="loading-inline">Loading tables...</div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search records..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="max-records" class="select-input">
            <option value="25">25 records</option>
            <option value="50">50 records</option>
            <option value="100" selected>100 records</option>
            <option value="500">500 records</option>
          </select>
          <button id="refresh-btn" class="btn-secondary" ${!configured ? 'disabled' : ''}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Dynamic Content Container -->
      <div id="content-container">
        ${configured ? '<div class="loading-container"><div class="loading"></div></div>' :
          emptyState({
            title: 'Airtable Not Configured',
            message: 'Configure Airtable credentials to view data.',
            icon: '⚙️'
          })}
      </div>

      <!-- Status Toast -->
      <div id="status-toast" class="status-toast" style="display: none;"></div>
    </div>
  `;

  const styles = `
    <style>
      .config-warning {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }

      .warning-icon { font-size: 1.5rem; }

      .warning-content strong {
        display: block;
        color: #92400e;
        margin-bottom: 0.25rem;
      }

      .warning-content p {
        color: #a16207;
        font-size: 0.875rem;
        margin: 0;
      }

      .tabs {
        display: flex;
        gap: 0.25rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0;
        flex-wrap: wrap;
        min-height: 42px;
        align-items: center;
      }

      .loading-inline {
        color: var(--text-secondary);
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem 0.75rem;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .tab:hover { color: var(--text-primary); }

      .tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
      }

      .tab-count {
        background: var(--background);
        padding: 0.1rem 0.4rem;
        border-radius: 99px;
        font-size: 0.7rem;
      }

      .tab.active .tab-count {
        background: var(--primary-light);
        color: var(--primary);
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

      .select-input {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.875rem;
        background: var(--surface);
        cursor: pointer;
      }

      .btn-secondary {
        padding: 0.75rem 1.25rem;
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover:not(:disabled) {
        background: var(--background);
      }

      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      /* Table Styles */
      .records-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .records-table th {
        background: var(--background);
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }

      .records-table td {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--border);
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .records-table tr:last-child td {
        border-bottom: none;
      }

      .records-table tr:hover {
        background: var(--background);
      }

      .cell-actions {
        width: 40px;
        text-align: center;
      }

      .airtable-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--primary-light);
        color: var(--primary);
        border-radius: 6px;
        font-size: 0.9rem;
        text-decoration: none;
        transition: all 0.2s;
      }

      .airtable-link:hover {
        background: var(--primary);
        color: white;
      }

      .cell-id {
        font-family: monospace;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .cell-json {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--primary);
        cursor: pointer;
      }

      .cell-json:hover {
        text-decoration: underline;
      }

      .cell-link {
        color: var(--primary);
        cursor: pointer;
      }

      .cell-link:hover {
        text-decoration: underline;
      }

      .cell-array {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .array-tag {
        background: var(--primary-light);
        color: var(--primary);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-size: 0.7rem;
      }

      .cell-boolean {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }

      .bool-true {
        color: #16a34a;
      }

      .bool-false {
        color: #dc2626;
      }

      /* Schema Info */
      .schema-info {
        background: var(--background);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        font-size: 0.8rem;
      }

      .schema-info summary {
        cursor: pointer;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .schema-fields {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
        margin-top: 0.75rem;
      }

      .schema-field {
        display: flex;
        justify-content: space-between;
        padding: 0.25rem 0.5rem;
        background: var(--surface);
        border-radius: 4px;
      }

      .field-name {
        font-weight: 500;
      }

      .field-type {
        color: var(--text-secondary);
        font-size: 0.75rem;
      }

      .status-toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        background: var(--surface);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
        z-index: 1000;
      }

      .status-toast.success { border-left: 4px solid #16a34a; }
      .status-toast.error { border-left: 4px solid #dc2626; }
      .status-toast.loading { border-left: 4px solid var(--primary); }

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }

      .table-wrapper {
        overflow-x: auto;
      }

      /* JSON Modal */
      .json-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }

      .json-modal-content {
        background: var(--surface);
        border-radius: 12px;
        max-width: 800px;
        max-height: 80vh;
        width: 90%;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .json-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
      }

      .json-modal-header h3 {
        margin: 0;
        font-size: 1rem;
      }

      .json-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-secondary);
      }

      .json-modal-body {
        padding: 1.5rem;
        overflow: auto;
        max-height: calc(80vh - 60px);
      }

      .json-modal-body pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 0.8rem;
        line-height: 1.5;
      }

      @media (max-width: 768px) {
        .tabs { gap: 0.15rem; }
        .tab { padding: 0.4rem 0.5rem; font-size: 0.75rem; }
        .tab-count { display: none; }
        .records-table { font-size: 0.8rem; }
        .records-table th, .records-table td { padding: 0.5rem; }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      const CONFIGURED = ${configured};
      const AIRTABLE_BASE_ID = '${airtableBaseId || ''}';
      let tables = [];
      let currentTable = null;
      let currentRecords = [];
      let currentSearch = '';

      // Initialize
      if (CONFIGURED) {
        loadTables();
      }

      // Event listeners
      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value.toLowerCase();
        renderRecords(filterRecords(currentRecords));
      }, 300));

      document.getElementById('refresh-btn').addEventListener('click', function() {
        if (currentTable) {
          loadRecords(currentTable.id, true);
        }
      });

      document.getElementById('max-records').addEventListener('change', function() {
        if (currentTable) {
          loadRecords(currentTable.id, true);
        }
      });

      async function loadTables() {
        try {
          const response = await fetch(API_BASE + '/api/airtable/tables/summary?noCache=true');
          const data = await response.json();

          if (data.success && data.data) {
            tables = data.data.tables;
            renderTabs(tables);

            // Update page header count
            const totalRecords = data.data.totalRecords || 0;
            const countEl = document.querySelector('.header-count');
            if (countEl) countEl.textContent = totalRecords;

            // Select first table by default
            if (tables.length > 0) {
              selectTable(tables[0].id);
            }
          } else {
            showError('Failed to load tables');
          }
        } catch (error) {
          console.error('Failed to load tables:', error);
          showError('Failed to load tables: ' + error.message);
        }
      }

      function renderTabs(tables) {
        const container = document.getElementById('tabs-container');

        if (!tables || tables.length === 0) {
          container.innerHTML = '<div class="loading-inline">No tables found</div>';
          return;
        }

        container.innerHTML = tables.map(table => \`
          <button class="tab" data-table-id="\${table.id}" title="\${table.name}">
            \${getTableIcon(table.name)}
            <span class="tab-name">\${table.name}</span>
            <span class="tab-count">\${table.recordCount || 0}</span>
          </button>
        \`).join('');

        // Add click handlers
        container.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click', function() {
            selectTable(this.dataset.tableId);
          });
        });
      }

      function getTableIcon(name) {
        const n = name.toLowerCase();
        if (n.includes('character')) return '👤';
        if (n.includes('profile')) return '📋';
        if (n.includes('brand')) return '🏷️';
        if (n.includes('content')) return '📝';
        if (n.includes('article')) return '📰';
        if (n.includes('youtube') || n.includes('video')) return '📹';
        if (n.includes('twitter') || n.includes('tweet')) return '🐦';
        if (n.includes('instagram')) return '📸';
        if (n.includes('image') || n.includes('prompt')) return '🖼️';
        if (n.includes('social')) return '📱';
        if (n.includes('template')) return '📄';
        if (n.includes('source') || n.includes('transcript')) return '📚';
        if (n.includes('episode')) return '🎬';
        if (n.includes('news')) return '📰';
        return '📊';
      }

      function selectTable(tableId) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector('[data-table-id="' + tableId + '"]');
        if (tab) tab.classList.add('active');

        // Find table data
        currentTable = tables.find(t => t.id === tableId);

        // Load records
        loadRecords(tableId);
      }

      async function loadRecords(tableId, noCache = false) {
        const container = document.getElementById('content-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        const maxRecords = document.getElementById('max-records').value;

        try {
          const url = API_BASE + '/api/airtable/tables/' + encodeURIComponent(tableId) +
                      '/records?maxRecords=' + maxRecords + (noCache ? '&noCache=true' : '');
          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.data) {
            currentRecords = data.data;
            renderTableView();
          } else {
            container.innerHTML = '<div class="no-results"><p>' + (data.error || 'Failed to load records') + '</p></div>';
          }
        } catch (error) {
          console.error('Failed to load records:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load records</p></div>';
        }
      }

      function filterRecords(records) {
        if (!currentSearch) return records;
        return records.filter(r => {
          const str = JSON.stringify(r.fields).toLowerCase();
          return str.includes(currentSearch);
        });
      }

      function renderTableView() {
        const container = document.getElementById('content-container');
        const filtered = filterRecords(currentRecords);

        if (!filtered || filtered.length === 0) {
          container.innerHTML = '<div class="no-results"><p>No records found</p></div>';
          return;
        }

        // Get all unique field names
        const fieldSet = new Set();
        filtered.forEach(r => Object.keys(r.fields).forEach(k => fieldSet.add(k)));
        const fields = Array.from(fieldSet);

        // Schema info
        const schemaHtml = currentTable && currentTable.fields ? \`
          <details class="schema-info">
            <summary>📋 Table Schema (\${currentTable.fields.length} fields)</summary>
            <div class="schema-fields">
              \${currentTable.fields.map(f => \`
                <div class="schema-field">
                  <span class="field-name">\${f.name}</span>
                  <span class="field-type">\${f.type}</span>
                </div>
              \`).join('')}
            </div>
          </details>
        \` : '';

        // Table HTML
        const tableHtml = \`
          \${schemaHtml}
          <div class="table-wrapper">
            <table class="records-table">
              <thead>
                <tr>
                  <th></th>
                  \${fields.slice(0, 8).map(f => \`<th>\${f}</th>\`).join('')}
                </tr>
              </thead>
              <tbody>
                \${filtered.map(record => \`
                  <tr>
                    <td class="cell-actions">
                      \${AIRTABLE_BASE_ID ? \`<a href="https://airtable.com/\${AIRTABLE_BASE_ID}/\${currentTable.id}/\${record.id}" target="_blank" class="airtable-link" title="Open in Airtable">↗</a>\` : ''}
                    </td>
                    \${fields.slice(0, 8).map(f => \`<td>\${formatCell(record.fields[f], f)}</td>\`).join('')}
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
          <p style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 1rem;">
            Showing \${filtered.length} of \${currentRecords.length} records
            \${fields.length > 8 ? ' • ' + (fields.length - 8) + ' columns hidden' : ''}
          </p>
        \`;

        container.innerHTML = tableHtml;

        // Add click handlers for JSON cells
        container.querySelectorAll('.cell-json').forEach(cell => {
          cell.addEventListener('click', function() {
            showJsonModal(this.dataset.field, this.dataset.value);
          });
        });
      }

      function formatCell(value, fieldName) {
        if (value === undefined || value === null) return '<span style="color: var(--text-secondary)">—</span>';

        if (typeof value === 'boolean') {
          return \`<span class="cell-boolean \${value ? 'bool-true' : 'bool-false'}">\${value ? '✓' : '✗'} \${value}</span>\`;
        }

        if (Array.isArray(value)) {
          if (value.length === 0) return '<span style="color: var(--text-secondary)">[]</span>';
          if (value.length <= 3) {
            return \`<div class="cell-array">\${value.map(v => \`<span class="array-tag">\${truncate(String(v), 20)}</span>\`).join('')}</div>\`;
          }
          return \`<span class="cell-json" data-field="\${fieldName}" data-value='\${escapeHtml(JSON.stringify(value, null, 2))}'>[\${value.length} items]</span>\`;
        }

        if (typeof value === 'object') {
          return \`<span class="cell-json" data-field="\${fieldName}" data-value='\${escapeHtml(JSON.stringify(value, null, 2))}'>{...}</span>\`;
        }

        const str = String(value);

        // Check if it's JSON string
        if (str.startsWith('{') || str.startsWith('[')) {
          try {
            const parsed = JSON.parse(str);
            return \`<span class="cell-json" data-field="\${fieldName}" data-value='\${escapeHtml(JSON.stringify(parsed, null, 2))}'>{JSON}</span>\`;
          } catch (e) {}
        }

        // Check if it's a URL
        if (str.startsWith('http')) {
          return \`<a href="\${str}" target="_blank" class="cell-link">\${truncate(str, 40)}</a>\`;
        }

        return truncate(str, 50);
      }

      function truncate(str, len) {
        if (str.length <= len) return escapeHtml(str);
        return escapeHtml(str.substring(0, len)) + '...';
      }

      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function showJsonModal(field, value) {
        const modal = document.createElement('div');
        modal.className = 'json-modal';
        modal.innerHTML = \`
          <div class="json-modal-content">
            <div class="json-modal-header">
              <h3>\${field}</h3>
              <button class="json-modal-close">&times;</button>
            </div>
            <div class="json-modal-body">
              <pre>\${value}</pre>
            </div>
          </div>
        \`;

        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
          if (e.target === modal || e.target.classList.contains('json-modal-close')) {
            modal.remove();
          }
        });
      }

      function showError(message) {
        document.getElementById('content-container').innerHTML =
          '<div class="no-results"><p>' + message + '</p></div>';
      }

      function showToast(message, type) {
        const toast = document.getElementById('status-toast');
        toast.textContent = message;
        toast.className = 'status-toast ' + type;
        toast.style.display = 'block';

        if (type !== 'loading') {
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      }

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }
    </script>
  `;

  return baseLayout({
    title: 'Airtable Data - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
