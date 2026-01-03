import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';

export interface InsightsPageProps {
  apiBase: string;
  analyzedCount: number;
  pendingCount: number;
}

export function insightsPage({ apiBase, analyzedCount, pendingCount }: InsightsPageProps) {
  return baseLayout({
    title: 'Memory Insights',
    content: `
    ${nav({ currentPage: '/dashboard/insights', apiBase })}

    <div class="container">
    <div class="page-header">
      <div>
        <h1>💡 Memory Insights</h1>
        <p class="text-secondary">AI-powered analysis of your saved memories</p>
      </div>
      <div class="flex gap-2">
        <span class="badge badge-success">${analyzedCount} analyzed</span>
        ${pendingCount > 0 ? `<span class="badge badge-warning">${pendingCount} pending</span>` : ''}
        <button onclick="refreshInsights()" class="btn btn-secondary">
          <span>🔄</span> Refresh
        </button>
        ${pendingCount > 0 ? `
          <button onclick="analyzeAll()" class="btn btn-primary" id="analyzeAllBtn">
            <span>✨</span> Analyze All
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-4 mb-3" id="quickStats">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value" id="totalMemories">-</div>
        <div class="stat-label">Total Memories</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-value" id="highPriorityCount">-</div>
        <div class="stat-label">High Priority</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💼</div>
        <div class="stat-value" id="businessCount">-</div>
        <div class="stat-label">Business Ideas</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value" id="contentCount">-</div>
        <div class="stat-label">Content Ideas</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-2">
      <!-- Categories -->
      <div class="card">
        <h3 class="card-title">📁 Categories</h3>
        <div id="categoriesContainer" class="categories-grid">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>

      <!-- Content Potential -->
      <div class="card">
        <h3 class="card-title">📈 Platform Potential</h3>
        <div id="platformsContainer" class="platforms-grid">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
    </div>

    <!-- Suggested Actions -->
    <div class="card">
      <div class="flex justify-between items-center mb-2">
        <h3 class="card-title m-0">🚀 Suggested Actions</h3>
        <select id="actionFilter" class="input" style="width: auto;" onchange="filterActions()">
          <option value="">All Actions</option>
          <option value="twitter_thread">Twitter Thread</option>
          <option value="twitter_post">Twitter Post</option>
          <option value="linkedin_post">LinkedIn Post</option>
          <option value="linkedin_article">LinkedIn Article</option>
          <option value="instagram_carousel">Instagram Carousel</option>
          <option value="instagram_reel">Instagram Reel</option>
          <option value="youtube_video">YouTube Video</option>
          <option value="youtube_short">YouTube Short</option>
          <option value="tiktok">TikTok</option>
          <option value="blog_article">Blog Article</option>
          <option value="newsletter">Newsletter</option>
          <option value="implement">Implement</option>
          <option value="etsy_listing">Etsy Listing</option>
          <option value="create_product">Create Product</option>
        </select>
      </div>
      <div id="actionsContainer" class="actions-list">
        <div class="text-center py-4">
          <div class="loading loading-lg"></div>
          <p class="text-secondary mt-2">Loading suggestions...</p>
        </div>
      </div>
    </div>

    <!-- High Priority Items -->
    <div class="card">
      <h3 class="card-title">⚡ High Priority</h3>
      <div id="highPriorityContainer" class="priority-list">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    </div>

    <!-- Memory Detail Modal -->
    <div id="memoryModal" class="modal-overlay" style="display: none;" onclick="closeMemoryModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 id="modalTitle">Memory Details</h2>
          <button onclick="closeMemoryModal()" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <div class="modal-body" id="modalContent"></div>
      </div>
    </div>

    <style>
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        text-align: center;
        transition: all 0.2s;
      }

      .stat-card:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .stat-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .categories-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .category-chip {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-full);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .category-chip:hover {
        border-color: var(--primary);
        background: var(--primary-light);
      }

      .category-chip .count {
        background: var(--primary);
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
      }

      .platforms-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .platform-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: var(--background);
        border-radius: var(--radius-md);
      }

      .platform-icon {
        font-size: 1.5rem;
        width: 40px;
        text-align: center;
      }

      .platform-info {
        flex: 1;
      }

      .platform-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .platform-bar {
        height: 8px;
        background: var(--border);
        border-radius: var(--radius-full);
        overflow: hidden;
      }

      .platform-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--secondary));
        border-radius: var(--radius-full);
        transition: width 0.5s ease;
      }

      .platform-count {
        font-size: 0.875rem;
        color: var(--text-secondary);
        min-width: 60px;
        text-align: right;
      }

      .actions-list {
        max-height: 500px;
        overflow-y: auto;
      }

      .action-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        margin-bottom: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .action-item:hover {
        border-color: var(--primary);
        box-shadow: var(--shadow-sm);
      }

      .action-icon {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--background);
        border-radius: var(--radius-md);
      }

      .action-content {
        flex: 1;
      }

      .action-type {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .action-reason {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }

      .action-angle {
        font-size: 0.875rem;
        color: var(--primary);
        font-style: italic;
      }

      .action-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .priority-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .priority-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: var(--warning-light);
        border: 1px solid var(--warning);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
      }

      .priority-item:hover {
        transform: translateX(4px);
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
        border-radius: var(--radius-xl);
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-xl);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
      }

      .modal-header h2 {
        font-size: 1.25rem;
        margin: 0;
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
      }

      .analysis-section {
        margin-bottom: 1.5rem;
      }

      .analysis-section h4 {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .takeaway-list {
        list-style: none;
        padding: 0;
      }

      .takeaway-list li {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border-light);
        display: flex;
        gap: 0.5rem;
      }

      .takeaway-list li:last-child {
        border-bottom: none;
      }

      .loading {
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }

      .loading-lg {
        width: 40px;
        height: 40px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Modal enhancements */
      .modal-meta {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .content-text {
        background: var(--background);
        padding: 1rem;
        border-radius: var(--radius-md);
        font-size: 0.9rem;
        line-height: 1.6;
        max-height: 200px;
        overflow-y: auto;
      }

      .topic-tag {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: var(--primary-light);
        color: var(--primary);
        border-radius: var(--radius-full);
        font-size: 0.8rem;
        font-weight: 500;
      }

      .hashtag {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background: var(--background);
        color: var(--text-secondary);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-family: monospace;
      }

      .business-relevance {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem;
        background: var(--background);
        border-radius: var(--radius-md);
      }

      .relevance-score {
        text-align: center;
      }

      .score-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
      }

      .score-label {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .relevance-areas {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .area-tag {
        padding: 0.25rem 0.75rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-full);
        font-size: 0.8rem;
        text-transform: capitalize;
      }

      .relevant-platforms {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .relevant-platform {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0.75rem;
        background: var(--background);
        border-radius: var(--radius-md);
      }

      .relevant-platform .platform-name {
        font-weight: 600;
        flex: 1;
      }

      .platform-relevance {
        background: var(--primary);
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
      }

      .suggested-account {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-family: monospace;
      }

      .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          align-items: stretch;
        }

        .grid-4 {
          grid-template-columns: repeat(2, 1fr);
        }

        .action-item {
          flex-direction: column;
        }

        .platform-row {
          flex-wrap: wrap;
        }

        .business-relevance {
          flex-direction: column;
          text-align: center;
        }
      }
    </style>

    <script>
      const API_BASE = window.location.origin;
      let insightsData = null;

      const ACTION_ICONS = {
        twitter_thread: '🧵',
        twitter_post: '🐦',
        linkedin_post: '💼',
        linkedin_article: '📄',
        instagram_post: '📷',
        instagram_carousel: '🎠',
        instagram_reel: '🎬',
        youtube_video: '📺',
        youtube_short: '⚡',
        tiktok: '🎵',
        blog_article: '✍️',
        newsletter: '📧',
        implement: '🔧',
        research_more: '🔍',
        share_team: '👥',
        save_reference: '📌',
        create_product: '🏭',
        etsy_listing: '🛍️'
      };

      const CATEGORY_ICONS = {
        business: '💼',
        personal: '👤',
        tech: '💻',
        content: '📝',
        learning: '📚',
        idea: '💡',
        inspiration: '✨',
        reference: '📎'
      };

      const PLATFORM_ICONS = {
        twitter: '🐦',
        linkedin: '💼',
        instagram: '📷',
        youtube: '📺',
        tiktok: '🎵',
        article: '✍️'
      };

      async function loadInsights() {
        try {
          const response = await fetch(API_BASE + '/api/memory/insights/overview');
          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to load insights');
          }

          // Extract insights from the nested structure
          insightsData = data.insights || data;
          renderInsights(insightsData);
        } catch (error) {
          console.error('Error loading insights:', error);
          showError('Failed to load insights: ' + error.message);
        }
      }

      function renderInsights(data) {
        // Update quick stats - API returns totalAnalyzed, byActionPriority
        document.getElementById('totalMemories').textContent = data.totalAnalyzed || data.total || 0;
        document.getElementById('highPriorityCount').textContent =
          (data.byActionPriority?.high || data.byPriority?.high || 0);
        document.getElementById('businessCount').textContent =
          (data.byCategory?.business || 0) + (data.byCategory?.idea || 0);
        document.getElementById('contentCount').textContent =
          (data.byCategory?.content || 0);

        // Render categories
        renderCategories(data.byCategory || {});

        // Render platforms - API returns contentPotential with platform items
        renderPlatforms(data.contentPotential || {});

        // Render actions - build from contentPotential items
        const suggestions = buildSuggestionsFromContent(data.contentPotential || {});
        renderActions(suggestions);

        // Render high priority - extract from contentPotential
        const highPriorityItems = extractHighPriorityItems(data.contentPotential || {});
        renderHighPriority(highPriorityItems);
      }

      function buildSuggestionsFromContent(contentPotential) {
        const suggestions = [];
        for (const [platform, items] of Object.entries(contentPotential)) {
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item.analysis?.suggestedActions) {
                for (const action of item.analysis.suggestedActions) {
                  suggestions.push({
                    memoryId: item.id,
                    category: item.analysis.category,
                    sourceType: item.sourceType || (item.tag === 'tweet' || item.tag === 'youtube_video' ? 'post' : 'memory'),
                    action: action
                  });
                }
              }
            }
          }
        }
        // Sort by priority and dedupe
        return suggestions
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.action?.priority] || 2) - (priorityOrder[b.action?.priority] || 2);
          })
          .slice(0, 50);
      }

      function extractHighPriorityItems(contentPotential) {
        const items = [];
        const seen = new Set();
        for (const [platform, platformItems] of Object.entries(contentPotential)) {
          if (Array.isArray(platformItems)) {
            for (const item of platformItems) {
              if (!seen.has(item.id) && item.analysis?.actionPriority === 'high') {
                seen.add(item.id);
                items.push({
                  id: item.id,
                  text: item.title,
                  analysis: item.analysis,
                  sourceType: item.sourceType || (item.tag === 'tweet' || item.tag === 'youtube_video' ? 'post' : 'memory')
                });
              }
            }
          }
        }
        return items.slice(0, 10);
      }

      function renderCategories(categories) {
        const container = document.getElementById('categoriesContainer');
        const items = Object.entries(categories);

        if (items.length === 0) {
          container.innerHTML = '<p class="text-secondary">No categories yet</p>';
          return;
        }

        container.innerHTML = items
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => \`
            <div class="category-chip" onclick="filterByCategory('\${cat}')">
              <span>\${CATEGORY_ICONS[cat] || '📁'}</span>
              <span>\${cat}</span>
              <span class="count">\${count}</span>
            </div>
          \`).join('');
      }

      function renderPlatforms(potential) {
        const container = document.getElementById('platformsContainer');
        const platforms = Object.entries(potential);

        if (platforms.length === 0) {
          container.innerHTML = '<p class="text-secondary">No platform data yet</p>';
          return;
        }

        // API returns arrays of items per platform, calculate counts and avg scores
        const platformStats = platforms.map(([platform, items]) => {
          const itemsArray = Array.isArray(items) ? items : [];
          const count = itemsArray.length;
          // Calculate average score from item's contentPotential for this platform
          let totalScore = 0;
          for (const item of itemsArray) {
            const platformScore = item.analysis?.contentPotential?.[platform]?.score || 0;
            totalScore += platformScore;
          }
          const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
          return { platform, count, avgScore };
        });

        const maxCount = Math.max(...platformStats.map(p => p.count), 1);

        container.innerHTML = platformStats
          .sort((a, b) => b.count - a.count)
          .map(({ platform, count, avgScore }) => {
            const width = (count / maxCount) * 100;
            return \`
              <div class="platform-row">
                <div class="platform-icon">\${PLATFORM_ICONS[platform] || '📊'}</div>
                <div class="platform-info">
                  <div class="platform-name">\${platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
                  <div class="platform-bar">
                    <div class="platform-bar-fill" style="width: \${width}%"></div>
                  </div>
                </div>
                <div class="platform-count">\${count} items</div>
              </div>
            \`;
          }).join('');
      }

      function renderActions(suggestions) {
        const container = document.getElementById('actionsContainer');
        const filter = document.getElementById('actionFilter').value;

        let filtered = suggestions;
        if (filter) {
          filtered = suggestions.filter(s => s.action?.type === filter);
        }

        if (filtered.length === 0) {
          container.innerHTML = \`
            <div class="text-center py-4">
              <p class="text-secondary">No suggestions found</p>
            </div>
          \`;
          return;
        }

        container.innerHTML = filtered.slice(0, 20).map(item => \`
          <div class="action-item" onclick="viewMemory('\${item.memoryId}', '\${item.sourceType || ''}')">
            <div class="action-icon">
              \${ACTION_ICONS[item.action?.type] || '📋'}
            </div>
            <div class="action-content">
              <div class="action-type">\${formatActionType(item.action?.type)}</div>
              <div class="action-reason">\${escapeHtml(item.action?.reason || '')}</div>
              \${item.action?.suggestedAngle ? \`
                <div class="action-angle">💡 \${escapeHtml(item.action.suggestedAngle)}</div>
              \` : ''}
              <div class="action-meta">
                <span class="badge \${getPriorityBadge(item.action?.priority)}">\${item.action?.priority || 'medium'}</span>
                \${item.category ? \`<span class="badge badge-neutral">\${item.category}</span>\` : ''}
              </div>
            </div>
          </div>
        \`).join('');
      }

      function renderHighPriority(items) {
        const container = document.getElementById('highPriorityContainer');

        if (items.length === 0) {
          container.innerHTML = '<p class="text-secondary">No high priority items</p>';
          return;
        }

        container.innerHTML = items.slice(0, 10).map(item => \`
          <div class="priority-item" onclick="viewMemory('\${item.id}', '\${item.sourceType || ''}')">
            <div class="action-icon">⚡</div>
            <div class="action-content">
              <div class="action-type">\${escapeHtml(item.text?.substring(0, 100) || '')}...</div>
              <div class="action-meta">
                \${item.analysis?.category ? \`<span class="badge badge-neutral">\${item.analysis.category}</span>\` : ''}
                \${item.analysis?.suggestedActions?.[0]?.type ? \`
                  <span class="badge badge-primary">\${formatActionType(item.analysis.suggestedActions[0].type)}</span>
                \` : ''}
              </div>
            </div>
          </div>
        \`).join('');
      }

      async function viewMemory(memoryId, sourceType) {
        try {
          // First, try to find the item in our cached insights data (no auth required)
          const cachedItem = findItemInCache(memoryId);
          if (cachedItem) {
            showMemoryModal({
              id: cachedItem.id,
              text: cachedItem.title || '',
              analysis: cachedItem.analysis || {},
              context: {
                title: cachedItem.title?.substring(0, 100) || 'Item Details',
                type: cachedItem.tag || cachedItem.sourceType
              }
            });
            return;
          }

          // Fallback: try public insights endpoint to get item details
          const response = await fetch(API_BASE + '/api/memory/insights/item/' + memoryId);
          const data = await response.json();

          if (data.success && data.item) {
            showMemoryModal(data.item);
            return;
          }

          throw new Error(data.error || 'Item not found');
        } catch (error) {
          console.error('Error loading item:', error);
          alert('Failed to load item: ' + error.message);
        }
      }

      function findItemInCache(memoryId) {
        if (!insightsData?.contentPotential) return null;

        for (const [platform, items] of Object.entries(insightsData.contentPotential)) {
          if (Array.isArray(items)) {
            const found = items.find(item => item.id === memoryId);
            if (found) return found;
          }
        }
        return null;
      }

      function showMemoryModal(memory) {
        const analysis = memory.analysis || {};
        const context = memory.context || {};

        document.getElementById('modalTitle').textContent =
          context.title || context.extractedTitle || 'Memory Details';

        document.getElementById('modalContent').innerHTML = \`
          <!-- Header Meta -->
          <div class="modal-meta mb-2">
            <div class="flex gap-2 flex-wrap">
              \${analysis.category ? \`<span class="badge badge-primary">\${analysis.category}</span>\` : ''}
              \${analysis.contentType ? \`<span class="badge badge-neutral">\${analysis.contentType}</span>\` : ''}
              \${analysis.sentiment ? \`<span class="badge \${analysis.sentiment === 'positive' ? 'badge-success' : analysis.sentiment === 'negative' ? 'badge-error' : 'badge-neutral'}">\${analysis.sentiment}</span>\` : ''}
              \${analysis.actionPriority ? \`<span class="badge \${getPriorityBadge(analysis.actionPriority)}">\${analysis.actionPriority} priority</span>\` : ''}
              \${analysis.language ? \`<span class="badge badge-neutral">🌐 \${analysis.language.toUpperCase()}</span>\` : ''}
              \${analysis.estimatedTime ? \`<span class="badge badge-neutral">⏱️ \${analysis.estimatedTime}</span>\` : ''}
            </div>
          </div>

          <!-- Content -->
          <div class="analysis-section">
            <h4>📄 Content</h4>
            <p class="content-text">\${escapeHtml(memory.text || '')}</p>
          </div>

          <!-- Topics -->
          \${analysis.topics?.length ? \`
            <div class="analysis-section">
              <h4>🏷️ Topics</h4>
              <div class="flex gap-1 flex-wrap">
                \${analysis.topics.map(t => \`<span class="topic-tag">\${escapeHtml(t)}</span>\`).join('')}
              </div>
            </div>
          \` : ''}

          <!-- Key Takeaways -->
          \${analysis.keyTakeaways?.length ? \`
            <div class="analysis-section">
              <h4>💡 Key Takeaways</h4>
              <ul class="takeaway-list">
                \${analysis.keyTakeaways.map(t => \`<li>✓ \${escapeHtml(t)}</li>\`).join('')}
              </ul>
            </div>
          \` : ''}

          <!-- Business Relevance -->
          \${analysis.businessRelevance ? \`
            <div class="analysis-section">
              <h4>💼 Business Relevance</h4>
              <div class="business-relevance">
                <div class="relevance-score">
                  <span class="score-value">\${analysis.businessRelevance.score || 0}</span>
                  <span class="score-label">/100</span>
                </div>
                <div class="relevance-areas">
                  \${(analysis.businessRelevance.areas || []).map(area => \`
                    <span class="area-tag">\${escapeHtml(area)}</span>
                  \`).join('')}
                </div>
              </div>
            </div>
          \` : ''}

          <!-- Suggested Actions -->
          \${analysis.suggestedActions?.length ? \`
            <div class="analysis-section">
              <h4>🚀 Suggested Actions</h4>
              <div class="actions-list" style="max-height: none;">
                \${analysis.suggestedActions.map(action => \`
                  <div class="action-item" style="cursor: default;">
                    <div class="action-icon">\${ACTION_ICONS[action.type] || '📋'}</div>
                    <div class="action-content">
                      <div class="action-type">\${formatActionType(action.type)}</div>
                      <div class="action-reason">\${escapeHtml(action.reason || '')}</div>
                      \${action.suggestedAngle ? \`
                        <div class="action-angle">💡 \${escapeHtml(action.suggestedAngle)}</div>
                      \` : ''}
                      <span class="badge \${getPriorityBadge(action.priority)}">\${action.priority}</span>
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
          \` : ''}

          <!-- Content Potential by Platform -->
          \${analysis.contentPotential ? \`
            <div class="analysis-section">
              <h4>📈 Content Potential</h4>
              <div class="platforms-grid">
                \${Object.entries(analysis.contentPotential)
                  .filter(([, data]) => data.score > 30)
                  .sort((a, b) => b[1].score - a[1].score)
                  .map(([platform, data]) => \`
                    <div class="platform-row">
                      <div class="platform-icon">\${PLATFORM_ICONS[platform] || '📊'}</div>
                      <div class="platform-info">
                        <div class="platform-name">\${platform} - \${data.format || 'post'}</div>
                        <div class="platform-bar">
                          <div class="platform-bar-fill" style="width: \${data.score}%"></div>
                        </div>
                        \${data.angle ? \`<div class="text-small text-secondary mt-1">\${escapeHtml(data.angle)}</div>\` : ''}
                      </div>
                      <div class="platform-count">\${data.score}%</div>
                    </div>
                  \`).join('')}
              </div>
            </div>
          \` : ''}

          <!-- Relevant Platforms -->
          \${analysis.relevantPlatforms?.length ? \`
            <div class="analysis-section">
              <h4>🎯 Best Platforms</h4>
              <div class="relevant-platforms">
                \${analysis.relevantPlatforms.map(p => \`
                  <div class="relevant-platform">
                    <span class="platform-name">\${escapeHtml(p.name)}</span>
                    <span class="platform-relevance">\${p.relevance}%</span>
                    \${p.suggestedAccount ? \`<span class="suggested-account">@\${escapeHtml(p.suggestedAccount)}</span>\` : ''}
                  </div>
                \`).join('')}
              </div>
            </div>
          \` : ''}

          <!-- Suggested Tags -->
          \${analysis.suggestedTags?.length ? \`
            <div class="analysis-section">
              <h4>#️⃣ Suggested Hashtags</h4>
              <div class="flex gap-1 flex-wrap">
                \${analysis.suggestedTags.map(t => \`<span class="hashtag">\${escapeHtml(t)}</span>\`).join('')}
              </div>
            </div>
          \` : ''}

          <!-- Footer -->
          <div class="modal-footer mt-3">
            <div class="text-small text-secondary">
              \${analysis.analyzedAt ? \`Analyzed: \${new Date(analysis.analyzedAt).toLocaleString()}\` : ''}
            </div>
            <button onclick="closeMemoryModal()" class="btn btn-secondary">Close</button>
          </div>
        \`;

        document.getElementById('memoryModal').style.display = 'flex';
      }

      function closeMemoryModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('memoryModal').style.display = 'none';
      }

      function filterActions() {
        if (insightsData) {
          renderActions(insightsData.topSuggestions || []);
        }
      }

      function filterByCategory(category) {
        // Could implement category-specific view
        console.log('Filter by category:', category);
      }

      async function analyzeAll() {
        const btn = document.getElementById('analyzeAllBtn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="loading loading-sm"></span> Analyzing...';
        }

        let totalAnalyzed = 0;
        let totalErrors = 0;

        try {
          // Process memories in batches
          let hasMoreMemories = true;
          let memoryOffset = 0;
          while (hasMoreMemories) {
            if (btn) btn.innerHTML = '<span class="loading loading-sm"></span> Memories: ' + totalAnalyzed;
            const res = await fetch(API_BASE + '/api/admin/batch-analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': 'migrate-vectors-2025'
              },
              body: JSON.stringify({ batchSize: 5, offset: memoryOffset })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed');
            totalAnalyzed += data.analyzed || 0;
            totalErrors += data.errors || 0;
            hasMoreMemories = data.hasMore;
            memoryOffset = data.nextOffset || memoryOffset + 5;
          }

          // Process posts in batches
          let hasMorePosts = true;
          let postOffset = 0;
          while (hasMorePosts) {
            if (btn) btn.innerHTML = '<span class="loading loading-sm"></span> Posts: ' + totalAnalyzed;
            const res = await fetch(API_BASE + '/api/admin/batch-analyze-posts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': 'migrate-vectors-2025'
              },
              body: JSON.stringify({ batchSize: 5, offset: postOffset })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed');
            totalAnalyzed += data.analyzed || 0;
            totalErrors += data.errors || 0;
            hasMorePosts = data.hasMore;
            postOffset = data.nextOffset || postOffset + 5;
          }

          alert('Analysis complete! Analyzed: ' + totalAnalyzed + ', Errors: ' + totalErrors);
          loadInsights();
        } catch (error) {
          console.error('Error:', error);
          alert('Analysis stopped: ' + error.message + '. Analyzed: ' + totalAnalyzed);
          loadInsights();
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>✨</span> Analyze All';
          }
        }
      }

      function refreshInsights() {
        loadInsights();
      }

      function formatActionType(type) {
        if (!type) return 'Action';
        return type
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      function getPriorityBadge(priority) {
        const badges = {
          high: 'badge-error',
          medium: 'badge-warning',
          low: 'badge-neutral'
        };
        return badges[priority] || 'badge-neutral';
      }

      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function showError(message) {
        document.getElementById('actionsContainer').innerHTML = \`
          <div class="alert alert-error">\${message}</div>
        \`;
      }

      // Load on page load
      loadInsights();
    </script>
    </div>
    `
  });
}
