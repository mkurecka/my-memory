/**
 * Settings page with tabs for AI models and webhooks
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';

export interface SettingsPageProps {
  apiBase: string;
  settings: {
    textModels?: string[];
    imageModels?: string[];
    videoModels?: string[];
    imageGenModels?: string[];
    openrouterApiKey?: string;
  };
  webhooksCount?: number;
}

export function settingsPage({ apiBase, settings, webhooksCount = 0 }: SettingsPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/settings', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Settings',
        subtitle: 'Configure AI models and webhooks',
        icon: '⚙️',
        backLink: '/dashboard'
      })}

      <!-- Tabs Navigation -->
      <div class="settings-tabs">
        <button class="settings-tab active" data-tab="ai-models">
          🤖 AI Models
        </button>
        <button class="settings-tab" data-tab="webhooks">
          📡 Webhooks
          ${webhooksCount > 0 ? `<span class="tab-badge">${webhooksCount}</span>` : ''}
        </button>
      </div>

      <!-- AI Models Tab -->
      <div id="ai-models-tab" class="tab-content active">
        <!-- API Configuration -->
        <div class="settings-card api-card">
          <h2 class="card-title">🔑 API Configuration</h2>
          <div class="form-group">
            <label for="openrouter-key">OpenRouter API Key</label>
            <div class="input-with-toggle">
              <input
                type="password"
                id="openrouter-key"
                placeholder="sk-or-v1-..."
                value="${settings.openrouterApiKey ? '••••••••••••••••' : ''}"
              />
              <button type="button" class="toggle-visibility" onclick="toggleKeyVisibility()">👁️</button>
            </div>
            <small class="form-hint">Get your API key from <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a></small>
          </div>
        </div>

        <div class="settings-grid">
          <!-- Text Generation -->
          <div class="settings-card">
            <div class="card-header">
              <h2 class="card-title">📝 Text Generation</h2>
              <button type="button" class="refresh-btn" onclick="loadTextModels(true)" title="Refresh models">🔄</button>
            </div>
            <p class="card-description">Models for rewriting, summarizing, and processing text</p>
            <div class="model-search">
              <input type="text" id="text-search" placeholder="Search models..." oninput="filterModels('text')">
            </div>
            <div class="model-list" id="text-models">
              <div class="loading">Loading models...</div>
            </div>
            <div class="model-footer">
              <span class="model-count" id="text-model-count">0 models</span>
              <span class="selected-count" id="text-selected-count">0 selected</span>
            </div>
          </div>

          <!-- Image Analysis -->
          <div class="settings-card">
            <div class="card-header">
              <h2 class="card-title">🖼️ Image Analysis</h2>
              <button type="button" class="refresh-btn" onclick="loadVisionModels(true)" title="Refresh models">🔄</button>
            </div>
            <p class="card-description">Vision models for describing and analyzing images</p>
            <div class="model-search">
              <input type="text" id="image-search" placeholder="Search models..." oninput="filterModels('image')">
            </div>
            <div class="model-list" id="image-models">
              <div class="loading">Loading models...</div>
            </div>
            <div class="model-footer">
              <span class="model-count" id="image-model-count">0 models</span>
              <span class="selected-count" id="image-selected-count">0 selected</span>
            </div>
          </div>

          <!-- Video/Transcript Processing -->
          <div class="settings-card">
            <div class="card-header">
              <h2 class="card-title">🎬 Video Processing</h2>
              <button type="button" class="refresh-btn" onclick="loadVideoModels(true)" title="Refresh models">🔄</button>
            </div>
            <p class="card-description">Models for transcript summarization and video analysis</p>
            <div class="model-search">
              <input type="text" id="video-search" placeholder="Search models..." oninput="filterModels('video')">
            </div>
            <div class="model-list" id="video-models">
              <div class="loading">Loading models...</div>
            </div>
            <div class="model-footer">
              <span class="model-count" id="video-model-count">0 models</span>
              <span class="selected-count" id="video-selected-count">0 selected</span>
            </div>
          </div>

          <!-- Image Generation -->
          <div class="settings-card">
            <div class="card-header">
              <h2 class="card-title">🎨 Image Generation</h2>
              <button type="button" class="refresh-btn" onclick="loadImageGenModels(true)" title="Refresh models">🔄</button>
            </div>
            <p class="card-description">Models for generating images from text prompts</p>
            <div class="model-search">
              <input type="text" id="imagegen-search" placeholder="Search models..." oninput="filterModels('imagegen')">
            </div>
            <div class="model-list" id="imagegen-models">
              <div class="loading">Loading models...</div>
            </div>
            <div class="model-footer">
              <span class="model-count" id="imagegen-model-count">0 models</span>
              <span class="selected-count" id="imagegen-selected-count">0 selected</span>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="save-section">
          <button id="save-btn" class="btn btn-primary btn-large" onclick="saveSettings()">
            💾 Save Settings
          </button>
          <span id="save-status" class="save-status"></span>
        </div>

        <!-- Current Settings Debug -->
        <details class="debug-section">
          <summary>🔧 Debug: Current Settings</summary>
          <pre id="current-settings">${JSON.stringify(settings, null, 2)}</pre>
        </details>
      </div>

      <!-- Webhooks Tab -->
      <div id="webhooks-tab" class="tab-content">
        <!-- Filters -->
        <div class="toolbar">
          <div class="search-box">
            <input type="text" id="webhook-search" placeholder="Search events..." />
            <span class="search-icon">🔍</span>
          </div>
          <div class="toolbar-actions">
            <select id="event-filter">
              <option value="">All Events</option>
              <option value="onSaveTweet">Save Tweet</option>
              <option value="onSaveYouTubeVideo">Save Video</option>
              <option value="saveToMemory">Save Memory</option>
              <option value="processText">Process Text</option>
            </select>
            <select id="webhook-sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        <!-- Webhooks List -->
        <div id="webhooks-container">
          <div class="loading-container"><div class="loading"></div></div>
        </div>

        <!-- Pagination -->
        <div id="webhook-pagination" class="pagination"></div>
      </div>

      <!-- Toast Notifications -->
      <div id="toast" class="toast"></div>
    </div>
  `;

  const styles = `
    <style>
      .settings-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        border-bottom: 2px solid var(--border);
        padding-bottom: 0;
      }

      .settings-tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .settings-tab:hover {
        color: var(--text-primary);
        background: var(--background);
      }

      .settings-tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
        background: var(--primary-light);
      }

      .tab-badge {
        background: var(--primary);
        color: white;
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-radius: 99px;
        font-weight: 600;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .api-card {
        margin-bottom: 1.5rem;
      }

      .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .settings-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .card-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .card-description {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
      }

      .model-search input, .search-box input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.875rem;
        background: var(--background);
        margin-bottom: 0.75rem;
      }

      .search-box {
        position: relative;
        flex: 1;
        min-width: 200px;
      }

      .search-box input {
        padding-left: 2.5rem;
        margin-bottom: 0;
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
      }

      .model-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--background);
      }

      .model-item {
        display: flex;
        align-items: flex-start;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.15s;
      }

      .model-item:last-child {
        border-bottom: none;
      }

      .model-item:hover {
        background: var(--surface);
      }

      .model-item.hidden {
        display: none;
      }

      .model-item input[type="checkbox"] {
        margin-right: 0.75rem;
        margin-top: 0.25rem;
        flex-shrink: 0;
      }

      .model-info {
        flex: 1;
        min-width: 0;
      }

      .model-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .model-meta {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.125rem;
      }

      .model-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .selected-count {
        color: var(--primary);
        font-weight: 500;
      }

      .loading, .loading-inline {
        padding: 2rem;
        text-align: center;
        color: var(--text-secondary);
      }

      .loading-inline {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      .form-group input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--background);
        color: var(--text-primary);
      }

      .input-with-toggle {
        display: flex;
        gap: 0.5rem;
      }

      .input-with-toggle input {
        flex: 1;
      }

      .toggle-visibility,
      .refresh-btn {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s;
      }

      .toggle-visibility:hover,
      .refresh-btn:hover {
        background: var(--background);
      }

      .refresh-btn.loading {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .form-hint {
        display: block;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.5rem;
      }

      .form-hint a {
        color: var(--primary);
      }

      .save-section {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--surface);
        border-radius: 12px;
        margin-bottom: 2rem;
      }

      .btn-large {
        padding: 1rem 2rem;
        font-size: 1rem;
      }

      .save-status {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .save-status.success {
        color: var(--success);
      }

      .save-status.error {
        color: var(--error);
      }

      .debug-section {
        background: var(--surface);
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 2rem;
      }

      .debug-section summary {
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .debug-section pre {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--background);
        border-radius: 8px;
        font-size: 0.8rem;
        overflow-x: auto;
      }

      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .toolbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .toolbar-actions select, .select-input {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
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

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }

      .toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        background: var(--surface);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
        z-index: 1000;
        display: none;
        animation: slideIn 0.3s ease-out;
      }

      .toast.show {
        display: block;
      }

      .toast.success { border-left: 4px solid #16a34a; }
      .toast.error { border-left: 4px solid #dc2626; }
      .toast.info { border-left: 4px solid var(--primary); }

      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
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

      /* Webhook-specific styles */
      .webhooks-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .webhook-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid var(--event-color, #6b7280);
      }

      .webhook-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }

      .webhook-event {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .event-badge {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        text-transform: uppercase;
      }

      .event-tweet { background: #e8f5fd; color: #1da1f2; }
      .event-video { background: #fee2e2; color: #dc2626; }
      .event-memory { background: #f3e8ff; color: #8b5cf6; }
      .event-process { background: #dcfce7; color: #16a34a; }
      .event-visual { background: #fef3c7; color: #d97706; }
      .event-default { background: #f3f4f6; color: #6b7280; }

      .webhook-date {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .webhook-body {
        padding: 1rem;
      }

      .webhook-user {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
      }

      .webhook-data {
        background: var(--background);
        border-radius: 8px;
        padding: 0.75rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.8rem;
        max-height: 200px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .webhook-data-preview {
        color: var(--text-primary);
        line-height: 1.5;
      }

      .toggle-data {
        background: none;
        border: 1px solid var(--border);
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        color: var(--text-secondary);
        cursor: pointer;
        margin-top: 0.5rem;
      }

      .toggle-data:hover {
        background: var(--background);
        color: var(--text-primary);
      }

      @media (max-width: 768px) {
        .settings-tabs {
          gap: 0.25rem;
        }
        .settings-tab {
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
        }
        .tab-badge {
          display: none;
        }
        .settings-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';

      // Tab switching
      document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const targetTab = this.dataset.tab;

          // Update tab buttons
          document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
          this.classList.add('active');

          // Update tab content
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(targetTab + '-tab').classList.add('active');

          // Load content if needed
          if (targetTab === 'webhooks' && !window.webhooksLoaded) {
            loadWebhooks();
            window.webhooksLoaded = true;
          }
        });
      });

      // AI Models functionality
      ${getAIModelsScript(settings)}

      // Webhooks functionality
      ${getWebhooksScript()}

      // Initialize AI models tab on page load
      init();
    </script>
  `;

  return baseLayout({
    title: 'Settings - My Memory 🧠',
    content,
    styles,
    scripts
  });
}

// Helper function to get AI models script
function getAIModelsScript(settings: any): string {
  return `
    let keyModified = false;
    const allModels = {
      text: [],
      image: [],
      video: [],
      imagegen: []
    };

    const selectedModels = {
      text: ${JSON.stringify(settings.textModels || [])},
      image: ${JSON.stringify(settings.imageModels || [])},
      video: ${JSON.stringify(settings.videoModels || [])},
      imagegen: ${JSON.stringify(settings.imageGenModels || [])}
    };

    function toggleKeyVisibility() {
      const input = document.getElementById('openrouter-key');
      const btn = document.querySelector('.toggle-visibility');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    }

    document.getElementById('openrouter-key').addEventListener('input', function() {
      keyModified = true;
    });

    function renderModelList(category, models) {
      const container = document.getElementById(category + '-models');
      const selected = selectedModels[category] || [];

      if (!models.length) {
        container.innerHTML = '<div class="loading">No models available</div>';
        return;
      }

      container.innerHTML = models.map(m => {
        const isChecked = selected.includes(m.id);
        return '<label class="model-item" data-name="' + m.name.toLowerCase() + '" data-id="' + m.id.toLowerCase() + '">' +
          '<input type="checkbox" value="' + m.id + '" ' + (isChecked ? 'checked' : '') + ' onchange="toggleModel(\\'' + category + '\\', \\'' + m.id + '\\')">' +
          '<div class="model-info">' +
            '<div class="model-name">' + m.name + '</div>' +
            '<div class="model-meta">' + m.id + (m.contextLength ? ' • ' + (m.contextLength / 1000) + 'k ctx' : '') + '</div>' +
          '</div>' +
        '</label>';
      }).join('');

      updateCounts(category, models.length);
    }

    function toggleModel(category, modelId) {
      const idx = selectedModels[category].indexOf(modelId);
      if (idx === -1) {
        selectedModels[category].push(modelId);
      } else {
        selectedModels[category].splice(idx, 1);
      }
      updateCounts(category, allModels[category].length);
    }

    function updateCounts(category, total) {
      document.getElementById(category + '-model-count').textContent = total + ' models';
      document.getElementById(category + '-selected-count').textContent = selectedModels[category].length + ' selected';
    }

    function filterModels(category) {
      const search = document.getElementById(category + '-search').value.toLowerCase();
      const items = document.querySelectorAll('#' + category + '-models .model-item');

      items.forEach(item => {
        const name = item.dataset.name;
        const id = item.dataset.id;
        const visible = name.includes(search) || id.includes(search);
        item.classList.toggle('hidden', !visible);
      });
    }

    async function loadTextModels(refresh = false) {
      const container = document.getElementById('text-models');
      container.innerHTML = '<div class="loading">Loading models...</div>';

      try {
        const url = API_BASE + '/api/proxy/text-models' + (refresh ? '?refresh=true' : '');
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          allModels.text = result.data;
          renderModelList('text', result.data);
        }
      } catch (error) {
        console.error('Failed to load text models:', error);
        container.innerHTML = '<div class="loading">Failed to load models</div>';
      }
    }

    async function loadVisionModels(refresh = false) {
      const container = document.getElementById('image-models');
      container.innerHTML = '<div class="loading">Loading models...</div>';

      try {
        const url = API_BASE + '/api/proxy/vision-models' + (refresh ? '?refresh=true' : '');
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          allModels.image = result.data;
          renderModelList('image', result.data);
        }
      } catch (error) {
        console.error('Failed to load vision models:', error);
        container.innerHTML = '<div class="loading">Failed to load models</div>';
      }
    }

    async function loadVideoModels(refresh = false) {
      const container = document.getElementById('video-models');
      container.innerHTML = '<div class="loading">Loading models...</div>';

      try {
        const url = API_BASE + '/api/proxy/text-models' + (refresh ? '?refresh=true' : '');
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          allModels.video = result.data;
          renderModelList('video', result.data);
        }
      } catch (error) {
        console.error('Failed to load video models:', error);
        container.innerHTML = '<div class="loading">Failed to load models</div>';
      }
    }

    async function loadImageGenModels(refresh = false) {
      const container = document.getElementById('imagegen-models');
      container.innerHTML = '<div class="loading">Loading models...</div>';

      try {
        const url = API_BASE + '/api/proxy/image-models' + (refresh ? '?refresh=true' : '');
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          allModels.imagegen = result.data;
          renderModelList('imagegen', result.data);
        }
      } catch (error) {
        console.error('Failed to load image gen models:', error);
        container.innerHTML = '<div class="loading">Failed to load models</div>';
      }
    }

    async function saveSettings() {
      const btn = document.getElementById('save-btn');
      const status = document.getElementById('save-status');

      btn.disabled = true;
      btn.textContent = '⏳ Saving...';
      status.textContent = '';
      status.className = 'save-status';

      const settings = {
        textModels: selectedModels.text,
        imageModels: selectedModels.image,
        videoModels: selectedModels.video,
        imageGenModels: selectedModels.imagegen,
      };

      const keyInput = document.getElementById('openrouter-key');
      if (keyModified && keyInput.value && !keyInput.value.startsWith('••')) {
        settings.openrouterApiKey = keyInput.value;
      }

      try {
        const response = await fetch(API_BASE + '/api/app-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });

        const result = await response.json();

        if (result.success) {
          status.textContent = '✓ Settings saved successfully!';
          status.className = 'save-status success';
          keyModified = false;
          document.getElementById('current-settings').textContent = JSON.stringify(result.settings, null, 2);
          showToast('Settings saved successfully!', 'success');
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      } catch (error) {
        console.error('Save error:', error);
        status.textContent = '✗ ' + error.message;
        status.className = 'save-status error';
        showToast('Failed to save settings', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Settings';
      }
    }

    async function loadSettings() {
      try {
        const response = await fetch(API_BASE + '/api/app-settings');
        const result = await response.json();

        if (result.success && result.settings) {
          const s = result.settings;
          if (s.textModels) selectedModels.text = s.textModels;
          if (s.imageModels) selectedModels.image = s.imageModels;
          if (s.videoModels) selectedModels.video = s.videoModels;
          if (s.imageGenModels) selectedModels.imagegen = s.imageGenModels;
          if (s.openrouterApiKey) {
            document.getElementById('openrouter-key').value = '••••••••••••••••';
          }
          document.getElementById('current-settings').textContent = JSON.stringify(s, null, 2);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    async function init() {
      await loadSettings();
      await Promise.all([
        loadTextModels(),
        loadVisionModels(),
        loadVideoModels(),
        loadImageGenModels()
      ]);
    }
  `;
}

// Helper function to get webhooks script
function getWebhooksScript(): string {
  return `
    let webhookPage = 1;
    let webhookSearch = '';
    let webhookEvent = '';
    let webhookSort = 'newest';
    const webhookPerPage = 20;

    document.getElementById('webhook-search')?.addEventListener('input', debounce(function(e) {
      webhookSearch = e.target.value;
      webhookPage = 1;
      loadWebhooks();
    }, 300));

    document.getElementById('event-filter')?.addEventListener('change', function(e) {
      webhookEvent = e.target.value;
      webhookPage = 1;
      loadWebhooks();
    });

    document.getElementById('webhook-sort')?.addEventListener('change', function(e) {
      webhookSort = e.target.value;
      loadWebhooks();
    });

    async function loadWebhooks() {
      const container = document.getElementById('webhooks-container');
      container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

      try {
        const offset = (webhookPage - 1) * webhookPerPage;
        let url = API_BASE + '/api/search/recent?table=webhook_events&limit=' + webhookPerPage + '&offset=' + offset;

        if (webhookSearch) url += '&q=' + encodeURIComponent(webhookSearch);
        if (webhookEvent) url += '&event=' + encodeURIComponent(webhookEvent);

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.results && data.results.length > 0) {
          let webhooks = data.results;
          if (webhookSort === 'oldest') {
            webhooks = webhooks.sort((a, b) => a.created_at - b.created_at);
          }

          const html = webhooks.map((item, index) => {
            const date = new Date(item.created_at);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const event = item.event || 'unknown';
            const eventClass = getEventClass(event);
            const eventLabel = formatEventName(event);
            const eventColor = getEventColor(event);
            const dataJson = item.data_json || '{}';
            let parsedData;
            try {
              parsedData = JSON.parse(dataJson);
            } catch (e) {
              parsedData = dataJson;
            }
            const preview = getDataPreview(parsedData);
            const uniqueId = 'webhook-data-' + index;

            return \`
              <div class="webhook-card" style="--event-color: \${eventColor}">
                <div class="webhook-header">
                  <div class="webhook-event">
                    <span class="event-badge \${eventClass}">\${eventLabel}</span>
                  </div>
                  <span class="webhook-date">\${dateStr}</span>
                </div>
                <div class="webhook-body">
                  \${item.user_id ? \`<div class="webhook-user">👤 User: \${item.user_id}</div>\` : ''}
                  <div class="webhook-data-preview">\${preview}</div>
                  <button class="toggle-data" onclick="toggleWebhookData('\${uniqueId}')">Show raw data</button>
                  <div id="\${uniqueId}" class="webhook-data" style="display: none;">\${JSON.stringify(parsedData, null, 2)}</div>
                </div>
              </div>
            \`;
          }).join('');

          container.innerHTML = '<div class="webhooks-grid">' + html + '</div>';
          updateWebhookPagination(data.total || webhooks.length);
        } else {
          container.innerHTML = '<div class="no-results"><p>No webhook events found</p></div>';
          document.getElementById('webhook-pagination').innerHTML = '';
        }
      } catch (error) {
        console.error('Failed to load webhooks:', error);
        container.innerHTML = '<div class="no-results"><p>Failed to load webhook events</p></div>';
      }
    }

    function getEventClass(event) {
      if (event.includes('Tweet')) return 'event-tweet';
      if (event.includes('Video') || event.includes('YouTube')) return 'event-video';
      if (event.includes('Memory')) return 'event-memory';
      if (event.includes('Process') || event.includes('Text')) return 'event-process';
      if (event.includes('Visual')) return 'event-visual';
      return 'event-default';
    }

    function getEventColor(event) {
      if (event.includes('Tweet')) return '#1da1f2';
      if (event.includes('Video') || event.includes('YouTube')) return '#dc2626';
      if (event.includes('Memory')) return '#8b5cf6';
      if (event.includes('Process') || event.includes('Text')) return '#16a34a';
      if (event.includes('Visual')) return '#d97706';
      return '#6b7280';
    }

    function formatEventName(event) {
      return event.replace('on', '').replace(/([A-Z])/g, ' $1').trim();
    }

    function getDataPreview(data) {
      if (!data) return 'No data';
      const innerData = data.data || data;

      if (innerData.text) return '📝 ' + truncate(innerData.text, 150);
      if (innerData.tweetId) return '🐦 Tweet ID: ' + innerData.tweetId + (innerData.text ? ' - ' + truncate(innerData.text, 100) : '');
      if (innerData.videoId) return '📹 Video: ' + (innerData.title || innerData.videoId);
      if (innerData.originalText) return '✨ ' + truncate(innerData.originalText, 150);

      const keys = Object.keys(innerData);
      if (keys.length > 0) return 'Fields: ' + keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : '');

      return 'Empty payload';
    }

    function toggleWebhookData(id) {
      const el = document.getElementById(id);
      const btn = el.previousElementSibling;
      if (el.style.display === 'none') {
        el.style.display = 'block';
        btn.textContent = 'Hide raw data';
      } else {
        el.style.display = 'none';
        btn.textContent = 'Show raw data';
      }
    }

    function updateWebhookPagination(total) {
      const totalPages = Math.ceil(total / webhookPerPage);
      const pagination = document.getElementById('webhook-pagination');

      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }

      let html = '';
      html += '<button ' + (webhookPage === 1 ? 'disabled' : '') + ' onclick="goToWebhookPage(' + (webhookPage - 1) + ')">← Prev</button>';

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= webhookPage - 2 && i <= webhookPage + 2)) {
          html += '<button class="' + (i === webhookPage ? 'active' : '') + '" onclick="goToWebhookPage(' + i + ')">' + i + '</button>';
        } else if (i === webhookPage - 3 || i === webhookPage + 3) {
          html += '<span style="padding: 0.5rem;">...</span>';
        }
      }

      html += '<button ' + (webhookPage === totalPages ? 'disabled' : '') + ' onclick="goToWebhookPage(' + (webhookPage + 1) + ')">Next →</button>';
      pagination.innerHTML = html;
    }

    function goToWebhookPage(page) {
      webhookPage = page;
      loadWebhooks();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  `;
}
