import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';

export interface SocialPostsSummary {
  profiles: number;
  posts: number;
  templates: number;
  images: number;
  postsByStatus: Record<string, number>;
}

export interface SocialPostsPageProps {
  apiBase: string;
  isConfigured?: boolean;
  summary?: SocialPostsSummary | null;
}

export function socialPostsPage({ apiBase, isConfigured = true, summary }: SocialPostsPageProps) {
  return baseLayout({
    title: 'Social Posts',
    content: `
    ${nav({ currentPage: '/dashboard/content', apiBase })}

    <div class="container">
    <div class="page-header">
      <div>
        <h1>📱 Social Posts</h1>
        <p class="text-secondary">Manage your social media content from Airtable</p>
      </div>
      <div class="flex gap-2">
        <button onclick="refreshData()" class="btn btn-secondary" ${!isConfigured ? 'disabled' : ''}>
          <span>🔄</span> Refresh
        </button>
      </div>
    </div>

    ${!isConfigured ? `
    <div class="alert alert-warning mb-4">
      <strong>⚠️ Airtable not configured</strong>
      <p>Please configure your Airtable API key in Settings to enable Social Posts management.</p>
      <a href="/dashboard/settings" class="btn btn-primary mt-2">Go to Settings</a>
    </div>
    ` : ''}

    <!-- Stats Cards -->
    <div class="stats-grid" id="statsContainer">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-value" id="postsCount">${summary?.posts ?? '-'}</div>
          <div class="stat-label">Posts</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👤</div>
        <div class="stat-content">
          <div class="stat-value" id="profilesCount">${summary?.profiles ?? '-'}</div>
          <div class="stat-label">Profiles</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-value" id="templatesCount">${summary?.templates ?? '-'}</div>
          <div class="stat-label">Templates</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🖼️</div>
        <div class="stat-content">
          <div class="stat-value" id="imagesCount">${summary?.images ?? '-'}</div>
          <div class="stat-label">Images</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs">
        <button class="tab active" data-tab="posts" onclick="switchTab('posts')">
          📝 Posts
        </button>
        <button class="tab" data-tab="profiles" onclick="switchTab('profiles')">
          👤 Profiles
        </button>
        <button class="tab" data-tab="templates" onclick="switchTab('templates')">
          📋 Templates
        </button>
        <button class="tab" data-tab="images" onclick="switchTab('images')">
          🖼️ Images
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div id="tabContent">
      <div class="text-center py-8">
        <div class="loading-spinner"></div>
        <p class="text-secondary mt-4">Loading data...</p>
      </div>
    </div>

    <!-- Detail Modal -->
    <div id="detailModal" class="modal-overlay" style="display: none;" onclick="closeModal(event)">
      <div class="modal-content modal-lg" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 id="modalTitle">Details</h2>
          <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <div class="modal-body" id="modalContent">
        </div>
      </div>
    </div>

    <style>
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .stat-icon {
        font-size: 2rem;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-light);
        border-radius: 12px;
      }
      .stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      .stat-label {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }
      .tabs-container { margin-bottom: 1.5rem; }
      .tabs {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid var(--border);
        padding-bottom: 0;
      }
      .tab {
        padding: 0.75rem 1.5rem;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
      }
      .tab:hover {
        color: var(--text-primary);
        background: var(--background);
      }
      .tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
      }
      .items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      .item-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .item-card:hover {
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.75rem;
      }
      .item-title {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        font-size: 1rem;
      }
      .item-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }
      .item-preview {
        width: 100%;
        height: 150px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 0.75rem;
        background: var(--background);
      }
      .item-description {
        font-size: 0.875rem;
        color: var(--text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
        padding: 1rem;
      }
      .modal-content {
        background: var(--surface);
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      }
      .modal-lg { max-width: 800px; }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
      }
      .modal-header h2 {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
      }
      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
      }
      .form-group { margin-bottom: 1.25rem; }
      .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
      }
      .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid var(--border);
        border-radius: 8px;
        font-size: 0.9375rem;
        background: var(--surface);
        color: var(--text-primary);
        transition: all 0.2s;
      }
      .form-input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      textarea.form-input {
        min-height: 100px;
        resize: vertical;
      }
      .loading-spinner {
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-primary {
        background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
        color: white;
      }
      .btn-secondary {
        background: var(--background);
        color: var(--text-primary);
        border: 1px solid var(--border);
      }
      .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
      }
      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
      }
      .flex { display: flex; }
      .gap-2 { gap: 0.5rem; }
      .justify-end { justify-content: flex-end; }
      .justify-between { justify-content: space-between; }
      .mt-2 { margin-top: 0.5rem; }
      .mt-4 { margin-top: 1rem; }
      .mb-4 { margin-bottom: 1rem; }
      .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
      .text-center { text-align: center; }
      .text-secondary { color: var(--text-secondary); }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
      .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      .badge-primary { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
      .badge-ghost { background: var(--background); color: var(--text-secondary); }
      .empty-state {
        text-align: center;
        padding: 3rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      .empty-state-icon { font-size: 3rem; margin-bottom: 1rem; }
    </style>

    <script>
      const API_BASE = window.location.origin;
      let currentTab = 'posts';
      let cachedData = { posts: null, profiles: null, templates: null, images: null };
      let currentStatusFilter = 'all';

      async function loadSummary() {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/summary');
          const data = await response.json();
          if (data.success) {
            document.getElementById('postsCount').textContent = data.data.posts;
            document.getElementById('profilesCount').textContent = data.data.profiles;
            document.getElementById('templatesCount').textContent = data.data.templates;
            document.getElementById('imagesCount').textContent = data.data.images;
          }
        } catch (error) {
          console.error('Error loading summary:', error);
        }
      }

      async function loadPosts(forceRefresh = false) {
        if (cachedData.posts && !forceRefresh) {
          renderPosts(cachedData.posts);
          return;
        }
        try {
          const response = await fetch(API_BASE + '/api/social-posts/posts');
          const data = await response.json();
          if (data.success) {
            cachedData.posts = data.data;
            renderPosts(data.data);
          }
        } catch (error) {
          console.error('Error loading posts:', error);
          showError('Failed to load posts');
        }
      }

      async function loadProfiles(forceRefresh = false) {
        if (cachedData.profiles && !forceRefresh) {
          renderProfiles(cachedData.profiles);
          return;
        }
        try {
          const response = await fetch(API_BASE + '/api/social-posts/profiles');
          const data = await response.json();
          if (data.success) {
            cachedData.profiles = data.data;
            renderProfiles(data.data);
          }
        } catch (error) {
          console.error('Error loading profiles:', error);
          showError('Failed to load profiles');
        }
      }

      async function loadTemplates(forceRefresh = false) {
        if (cachedData.templates && !forceRefresh) {
          renderTemplates(cachedData.templates);
          return;
        }
        try {
          const response = await fetch(API_BASE + '/api/social-posts/templates');
          const data = await response.json();
          if (data.success) {
            cachedData.templates = data.data;
            renderTemplates(data.data);
          }
        } catch (error) {
          console.error('Error loading templates:', error);
          showError('Failed to load templates');
        }
      }

      async function loadImages(forceRefresh = false) {
        if (cachedData.images && !forceRefresh) {
          renderImages(cachedData.images);
          return;
        }
        try {
          const response = await fetch(API_BASE + '/api/social-posts/images');
          const data = await response.json();
          if (data.success) {
            cachedData.images = data.data;
            renderImages(data.data);
          }
        } catch (error) {
          console.error('Error loading images:', error);
          showError('Failed to load images');
        }
      }

      function renderPosts(posts) {
        const container = document.getElementById('tabContent');
        if (!posts || posts.length === 0) {
          container.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">📝</div><h3>No posts found</h3><p class="text-secondary">Your social posts will appear here</p></div>\`;
          return;
        }

        const statusValues = [...new Set(posts.map(p => p.status).filter(Boolean))];
        const filteredPosts = currentStatusFilter === 'all' ? posts : posts.filter(p => (p.status || '').toLowerCase() === currentStatusFilter.toLowerCase());

        container.innerHTML = \`
          <div class="flex justify-between mb-4" style="align-items: center; flex-wrap: wrap; gap: 1rem;">
            <p class="text-secondary">\${filteredPosts.length} of \${posts.length} posts</p>
            <select id="statusFilter" onchange="filterByStatus(this.value)" class="form-input" style="width: auto; min-width: 140px;">
              <option value="all" \${currentStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
              \${statusValues.map(s => '<option value="' + escapeHtml(s.toLowerCase()) + '" ' + (currentStatusFilter === s.toLowerCase() ? 'selected' : '') + '>' + escapeHtml(s) + '</option>').join('')}
            </select>
          </div>
          \${filteredPosts.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>No posts match filter</h3></div>' : \`
            <div class="items-grid">
              \${filteredPosts.map(post => \`
                <div class="item-card" onclick="viewPost('\${post.id}')">
                  <div class="item-header">
                    <h3 class="item-title">\${escapeHtml(post.title || 'Untitled')}</h3>
                  </div>
                  \${post.content ? '<p class="item-description">' + escapeHtml(post.content) + '</p>' : ''}
                  <div class="item-meta">
                    \${post.status ? '<span class="badge ' + getStatusBadge(post.status) + '">' + escapeHtml(post.status) + '</span>' : ''}
                    \${post.platform ? '<span class="badge badge-primary">' + escapeHtml(post.platform) + '</span>' : ''}
                  </div>
                </div>
              \`).join('')}
            </div>
          \`}
        \`;
      }

      function filterByStatus(status) {
        currentStatusFilter = status;
        if (cachedData.posts) renderPosts(cachedData.posts);
      }

      function renderProfiles(profiles) {
        const container = document.getElementById('tabContent');
        if (!profiles || profiles.length === 0) {
          container.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">👤</div><h3>No profiles found</h3></div>\`;
          return;
        }
        container.innerHTML = \`
          <div class="items-grid">
            \${profiles.map(profile => \`
              <div class="item-card" onclick="viewProfile('\${profile.id}')">
                <div class="item-header">
                  <h3 class="item-title">\${escapeHtml(profile.name || 'Untitled')}</h3>
                </div>
                <div class="item-meta">
                  \${profile.platform ? '<span class="badge badge-primary">' + escapeHtml(profile.platform) + '</span>' : ''}
                  \${profile.handle ? '<span class="badge badge-ghost">@' + escapeHtml(profile.handle) + '</span>' : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      }

      function renderTemplates(templates) {
        const container = document.getElementById('tabContent');
        if (!templates || templates.length === 0) {
          container.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No templates found</h3></div>\`;
          return;
        }
        container.innerHTML = \`
          <div class="items-grid">
            \${templates.map(template => \`
              <div class="item-card" onclick="viewTemplate('\${template.id}')">
                <div class="item-header">
                  <h3 class="item-title">\${escapeHtml(template.name || 'Untitled')}</h3>
                </div>
                \${template.content ? '<p class="item-description">' + escapeHtml(template.content) + '</p>' : ''}
                <div class="item-meta">
                  \${template.type ? '<span class="badge badge-ghost">' + escapeHtml(template.type) + '</span>' : ''}
                  \${template.platform ? '<span class="badge badge-primary">' + escapeHtml(template.platform) + '</span>' : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      }

      function renderImages(images) {
        const container = document.getElementById('tabContent');
        if (!images || images.length === 0) {
          container.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">🖼️</div><h3>No images found</h3></div>\`;
          return;
        }
        container.innerHTML = \`
          <div class="items-grid">
            \${images.map(image => \`
              <div class="item-card" onclick="viewImage('\${image.id}')">
                \${image.thumbnailUrl || image.url ? '<img src="' + escapeHtml(image.thumbnailUrl || image.url) + '" class="item-preview" alt="' + escapeHtml(image.name) + '" onerror="this.style.display=\\'none\\'">' : '<div class="item-preview" style="display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">No preview</div>'}
                <div class="item-header">
                  <h3 class="item-title">\${escapeHtml(image.name || 'Untitled')}</h3>
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      }

      async function viewPost(id) {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/posts/' + id);
          const data = await response.json();
          if (!data.success) throw new Error(data.error);
          const post = data.data;
          document.getElementById('modalTitle').textContent = '📝 Post Details';
          document.getElementById('modalContent').innerHTML = \`
            <div class="form-group"><label>Title</label><input type="text" class="form-input" id="edit_title" value="\${escapeHtml(post.title || '')}"></div>
            <div class="form-group"><label>Content</label><textarea class="form-input" id="edit_content">\${escapeHtml(post.content || '')}</textarea></div>
            <div class="form-group"><label>Status</label><input type="text" class="form-input" id="edit_status" value="\${escapeHtml(post.status || '')}"></div>
            <div class="form-group"><label>Platform</label><input type="text" class="form-input" id="edit_platform" value="\${escapeHtml(post.platform || '')}"></div>
            <div class="flex gap-2 justify-end mt-4">
              <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
              <button onclick="savePost('\${id}')" class="btn btn-primary">Save</button>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          alert('Failed to load post: ' + error.message);
        }
      }

      async function viewProfile(id) {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/profiles/' + id);
          const data = await response.json();
          if (!data.success) throw new Error(data.error);
          const profile = data.data;
          document.getElementById('modalTitle').textContent = '👤 Profile Details';
          document.getElementById('modalContent').innerHTML = \`
            <div class="form-group"><label>Name</label><input type="text" class="form-input" id="edit_name" value="\${escapeHtml(profile.name || '')}"></div>
            <div class="form-group"><label>Platform</label><input type="text" class="form-input" id="edit_platform" value="\${escapeHtml(profile.platform || '')}"></div>
            <div class="form-group"><label>Handle</label><input type="text" class="form-input" id="edit_handle" value="\${escapeHtml(profile.handle || '')}"></div>
            <div class="form-group"><label>URL</label><input type="text" class="form-input" id="edit_url" value="\${escapeHtml(profile.url || '')}"></div>
            <div class="flex gap-2 justify-end mt-4">
              <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
              <button onclick="saveProfile('\${id}')" class="btn btn-primary">Save</button>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          alert('Failed to load profile: ' + error.message);
        }
      }

      async function viewTemplate(id) {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/templates/' + id);
          const data = await response.json();
          if (!data.success) throw new Error(data.error);
          const template = data.data;
          document.getElementById('modalTitle').textContent = '📋 Template Details';
          document.getElementById('modalContent').innerHTML = \`
            <div class="form-group"><label>Name</label><input type="text" class="form-input" id="edit_name" value="\${escapeHtml(template.name || '')}"></div>
            <div class="form-group"><label>Content</label><textarea class="form-input" id="edit_content">\${escapeHtml(template.content || '')}</textarea></div>
            <div class="form-group"><label>Type</label><input type="text" class="form-input" id="edit_type" value="\${escapeHtml(template.type || '')}"></div>
            <div class="form-group"><label>Platform</label><input type="text" class="form-input" id="edit_platform" value="\${escapeHtml(template.platform || '')}"></div>
            <div class="flex gap-2 justify-end mt-4">
              <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
              <button onclick="saveTemplate('\${id}')" class="btn btn-primary">Save</button>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          alert('Failed to load template: ' + error.message);
        }
      }

      async function viewImage(id) {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/images/' + id);
          const data = await response.json();
          if (!data.success) throw new Error(data.error);
          const image = data.data;
          const imgUrl = image.url || image.thumbnailUrl;
          document.getElementById('modalTitle').textContent = '🖼️ Image Details';
          document.getElementById('modalContent').innerHTML = \`
            \${imgUrl ? '<img src="' + escapeHtml(imgUrl) + '" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 1rem;">' : ''}
            <div class="form-group"><label>Name</label><input type="text" class="form-input" id="edit_name" value="\${escapeHtml(image.name || '')}"></div>
            <div class="flex gap-2 justify-end mt-4">
              <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
              <button onclick="saveImage('\${id}')" class="btn btn-primary">Save</button>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          alert('Failed to load image: ' + error.message);
        }
      }

      async function savePost(id) {
        const updates = {
          Title: document.getElementById('edit_title').value,
          Content: document.getElementById('edit_content').value,
          Status: document.getElementById('edit_status').value,
          Platform: document.getElementById('edit_platform').value
        };
        await saveItem('posts', id, updates);
      }

      async function saveProfile(id) {
        const updates = {
          Name: document.getElementById('edit_name').value,
          Platform: document.getElementById('edit_platform').value,
          Handle: document.getElementById('edit_handle').value,
          URL: document.getElementById('edit_url').value
        };
        await saveItem('profiles', id, updates);
      }

      async function saveTemplate(id) {
        const updates = {
          Name: document.getElementById('edit_name').value,
          Content: document.getElementById('edit_content').value,
          Type: document.getElementById('edit_type').value,
          Platform: document.getElementById('edit_platform').value
        };
        await saveItem('templates', id, updates);
      }

      async function saveImage(id) {
        const updates = { Name: document.getElementById('edit_name').value };
        await saveItem('images', id, updates);
      }

      async function saveItem(type, id, updates) {
        try {
          const response = await fetch(API_BASE + '/api/social-posts/' + type + '/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          const data = await response.json();
          if (!data.success) throw new Error(data.error);
          closeModal();
          cachedData[type] = null;
          switchTab(type);
          alert('Saved successfully!');
        } catch (error) {
          alert('Failed to save: ' + error.message);
        }
      }

      function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.getElementById('tabContent').innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-secondary mt-4">Loading...</p></div>';
        if (tab === 'posts') loadPosts();
        else if (tab === 'profiles') loadProfiles();
        else if (tab === 'templates') loadTemplates();
        else if (tab === 'images') loadImages();
      }

      function closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('detailModal').style.display = 'none';
      }

      function refreshData() {
        cachedData = { posts: null, profiles: null, templates: null, images: null };
        loadSummary();
        switchTab(currentTab);
      }

      function showError(message) {
        document.getElementById('tabContent').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p class="text-secondary">' + escapeHtml(message) + '</p><button onclick="refreshData()" class="btn btn-primary mt-4">Retry</button></div>';
      }

      function getStatusBadge(status) {
        if (!status) return 'badge-ghost';
        const s = status.toLowerCase();
        if (s === 'published' || s === 'done' || s === 'complete' || s === 'active') return 'badge-success';
        if (s === 'draft' || s === 'pending' || s === 'scheduled') return 'badge-warning';
        return 'badge-ghost';
      }

      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Initialize
      loadSummary();
      loadPosts();
    </script>
    </div>
    `
  });
}
