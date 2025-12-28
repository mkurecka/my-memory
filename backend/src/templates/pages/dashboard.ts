/**
 * Dashboard overview page - landing page with navigation cards
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { statCard } from '../components/stat-card';
import { skeletonStyles } from '../components/skeleton';

export interface DashboardStats {
  posts: {
    total: number;
    tweets: number;
    videos: number;
    memory: number;
  };
  webhooks: {
    total: number;
  };
  users: {
    total: number;
  };
}

export interface DashboardProps {
  stats: DashboardStats;
  apiBase: string;
}

export function dashboardPage({ stats, apiBase }: DashboardProps): string {
  const totalMemories = stats.posts.memory + stats.posts.tweets + stats.posts.videos;
  const navigationCards = [
    {
      title: 'All Memories',
      description: 'Saved content: text snippets, tweets, and videos',
      icon: '🧠',
      count: totalMemories,
      link: '/dashboard/memories',
      color: '#8b5cf6'
    },
    {
      title: 'AI Content',
      description: 'AI-generated and processed content',
      icon: '✨',
      count: stats.posts.total - stats.posts.tweets - stats.posts.videos,
      link: '/dashboard/ai-content',
      color: '#10b981'
    }
  ];

  const content = `
    ${nav({ currentPage: '/dashboard', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Dashboard Overview',
        subtitle: 'Welcome to your content hub. Quick access to all your content and tools.',
        icon: '📊'
      })}

      <!-- Quick Actions -->
      <div class="quick-actions mb-3">
        <a href="/dashboard/add" class="action-card action-primary">
          <div class="action-icon">➕</div>
          <div class="action-content">
            <h3>Add Memory</h3>
            <p>Save text content</p>
          </div>
        </a>
        <a href="/dashboard/ai-images" class="action-card action-secondary">
          <div class="action-icon">🎨</div>
          <div class="action-content">
            <h3>Generate Image</h3>
            <p>Create AI images</p>
          </div>
        </a>
        <a href="/dashboard/generate-carousel" class="action-card action-accent">
          <div class="action-icon">📱</div>
          <div class="action-content">
            <h3>Create Carousel</h3>
            <p>Instagram carousels</p>
          </div>
        </a>
      </div>

      <!-- Search Bar -->
      <div class="search-section mb-3">
        <div class="search-container">
          <input type="text" id="global-search" placeholder="Search all content..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="search-filters">
          <select id="search-type">
            <option value="">All Types</option>
            <option value="memory">Memories</option>
            <option value="tweet">Tweets</option>
            <option value="youtube_video">Videos</option>
            <option value="ai_content">AI Content</option>
            <option value="ai_image">AI Images</option>
          </select>
          <select id="search-date">
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div id="search-results" class="search-results"></div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-4 mb-3">
        ${statCard({
          title: 'Total Content',
          value: stats.posts.total + stats.posts.memory,
          subtitle: 'All saved items',
          icon: '📦'
        })}
        ${statCard({
          title: 'Memories',
          value: stats.posts.memory,
          subtitle: 'Text snippets',
          icon: '💾'
        })}
        ${statCard({
          title: 'Social Media',
          value: stats.posts.tweets,
          subtitle: 'From X/Twitter',
          icon: '🐦'
        })}
        ${statCard({
          title: 'Webhook Events',
          value: stats.webhooks.total,
          subtitle: 'Events logged',
          icon: '📡'
        })}
      </div>

      <!-- Navigation Cards -->
      <h2 class="section-title mb-2">Browse Content</h2>
      <div class="nav-cards-grid">
        ${navigationCards.map(card => `
          <a href="${card.link}" class="nav-card" style="--accent-color: ${card.color}">
            <div class="nav-card-icon">${card.icon}</div>
            <div class="nav-card-content">
              <h3>${card.title}</h3>
              <p>${card.description}</p>
            </div>
            <div class="nav-card-count">${card.count}</div>
            <div class="nav-card-arrow">→</div>
          </a>
        `).join('')}
      </div>

      <!-- Recent Activity Preview -->
      <div class="card mt-3">
        <h2 class="card-title">📋 Recent Activity</h2>
        <div id="recent-activity">
          <div class="activity-skeleton">
            ${Array(5).fill(0).map(() => `
              <div class="skeleton-activity-item">
                <div class="skeleton-activity-icon"></div>
                <div class="skeleton-activity-content">
                  <div class="skeleton-activity-text"></div>
                  <div class="skeleton-activity-meta"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      ${skeletonStyles}

      /* Quick Actions */
      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }

      .action-card {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 1.5rem;
        background: var(--surface);
        border-radius: 12px;
        text-decoration: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
        border: 2px solid transparent;
      }

      .action-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .action-card.action-primary {
        border-color: var(--primary);
      }

      .action-card.action-primary:hover {
        background: linear-gradient(135deg, rgba(6, 95, 74, 0.05), rgba(6, 95, 74, 0.1));
      }

      .action-card.action-secondary {
        border-color: #8b5cf6;
      }

      .action-card.action-secondary:hover {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.1));
      }

      .action-card.action-accent {
        border-color: #f59e0b;
      }

      .action-card.action-accent:hover {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.1));
      }

      .action-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
      }

      .action-content h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
      }

      .action-content p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      /* Search Section */
      .search-section {
        background: var(--surface);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .search-container {
        position: relative;
        margin-bottom: 1rem;
      }

      .search-container input {
        width: 100%;
        padding: 0.875rem 1rem 0.875rem 3rem;
        border: 2px solid var(--border);
        border-radius: 8px;
        font-size: 1rem;
        background: var(--background);
        transition: all 0.2s;
      }

      .search-container input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.25rem;
        pointer-events: none;
      }

      .search-filters {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .search-filters select {
        flex: 1;
        min-width: 150px;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--background);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .search-filters select:focus {
        outline: none;
        border-color: var(--primary);
      }

      /* Search Results */
      .search-results {
        margin-top: 1.5rem;
        display: none;
      }

      .search-results.active {
        display: block;
      }

      .search-result-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: var(--surface);
        border-radius: 8px;
        margin-bottom: 0.75rem;
        text-decoration: none;
        color: inherit;
        transition: all 0.2s;
      }

      .search-result-item:hover {
        background: var(--background);
        transform: translateX(4px);
      }

      .search-result-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .search-result-content {
        flex: 1;
        min-width: 0;
      }

      .search-result-title {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .search-result-meta {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      /* Activity Skeleton */
      .activity-skeleton {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .skeleton-activity-item {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }

      .skeleton-activity-item:last-child {
        border-bottom: none;
      }

      .skeleton-activity-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s ease-in-out infinite;
        flex-shrink: 0;
      }

      .skeleton-activity-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .skeleton-activity-text {
        height: 16px;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s ease-in-out infinite;
      }

      .skeleton-activity-meta {
        height: 12px;
        width: 60%;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s ease-in-out infinite;
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .nav-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }

      .nav-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--surface);
        border-radius: 12px;
        text-decoration: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
        border-left: 4px solid var(--accent-color, var(--primary));
      }

      .nav-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .nav-card-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
      }

      .nav-card-content {
        flex: 1;
        min-width: 0;
      }

      .nav-card-content h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .nav-card-content p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .nav-card-count {
        background: var(--background);
        color: var(--text-primary);
        font-weight: 700;
        font-size: 1.25rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .nav-card-arrow {
        color: var(--text-secondary);
        font-size: 1.5rem;
        transition: transform 0.2s;
      }

      .nav-card:hover .nav-card-arrow {
        transform: translateX(4px);
        color: var(--primary);
      }

      .activity-item {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .activity-content {
        flex: 1;
        min-width: 0;
      }

      .activity-text {
        font-size: 0.875rem;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .activity-meta {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }

      .activity-type {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.7rem;
        padding: 0.125rem 0.5rem;
        border-radius: 99px;
        font-weight: 500;
        text-transform: uppercase;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';

      async function loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        try {
          const [memoriesRes, postsRes] = await Promise.all([
            fetch(API_BASE + '/api/search/recent?table=memory&limit=5'),
            fetch(API_BASE + '/api/search/recent?table=posts&limit=5')
          ]);

          const [memoriesData, postsData] = await Promise.all([
            memoriesRes.json(),
            postsRes.json()
          ]);

          const activities = [];

          if (memoriesData.success && memoriesData.results) {
            memoriesData.results.forEach(item => {
              activities.push({
                type: 'memory',
                icon: '💾',
                text: item.text,
                date: new Date(item.created_at)
              });
            });
          }

          if (postsData.success && postsData.results) {
            postsData.results.forEach(item => {
              const icon = item.type === 'tweet' ? '🐦' : item.type === 'youtube_video' ? '📹' : '✨';
              activities.push({
                type: item.type || 'content',
                icon,
                text: item.original_text || item.title || 'Untitled',
                date: new Date(item.created_at)
              });
            });
          }

          // Sort by date descending
          activities.sort((a, b) => b.date - a.date);
          const recent = activities.slice(0, 10);

          if (recent.length > 0) {
            container.innerHTML = recent.map(item => \`
              <div class="activity-item">
                <span class="activity-icon">\${item.icon}</span>
                <div class="activity-content">
                  <div class="activity-text">\${item.text}</div>
                  <div class="activity-meta">
                    <span class="activity-type">\${item.type.replace(/_/g, ' ')}</span>
                    · \${item.date.toLocaleDateString()} \${item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            \`).join('');
          } else {
            container.innerHTML = '<p class="text-muted text-small">No recent activity. Start using the extension to save content!</p>';
          }
        } catch (error) {
          console.error('Failed to load activity:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load recent activity</p>';
        }
      }

      loadRecentActivity();

      // Global Search Functionality
      let searchTimeout;
      const searchInput = document.getElementById('global-search');
      const searchType = document.getElementById('search-type');
      const searchDate = document.getElementById('search-date');
      const searchResults = document.getElementById('search-results');

      async function performSearch() {
        const query = searchInput.value.trim();
        const type = searchType.value;
        const dateFilter = searchDate.value;

        if (!query && !type && !dateFilter) {
          searchResults.classList.remove('active');
          searchResults.innerHTML = '';
          return;
        }

        try {
          searchResults.innerHTML = '<p class="text-muted">Searching...</p>';
          searchResults.classList.add('active');

          const results = [];

          // Search memories
          if (!type || type === 'memory') {
            const memRes = await fetch(API_BASE + '/api/search/recent?table=memory&limit=5' + (query ? '&q=' + encodeURIComponent(query) : ''));
            const memData = await memRes.json();
            if (memData.success && memData.results) {
              memData.results.forEach(item => {
                results.push({
                  type: 'memory',
                  icon: '💾',
                  title: item.text.substring(0, 60) + '...',
                  date: new Date(item.created_at),
                  url: '/dashboard/memories'
                });
              });
            }
          }

          // Search posts
          if (!type || ['tweet', 'youtube_video', 'ai_content'].includes(type)) {
            const postsRes = await fetch(API_BASE + '/api/search/recent?table=posts&limit=5' + (query ? '&q=' + encodeURIComponent(query) : ''));
            const postsData = await postsRes.json();
            if (postsData.success && postsData.results) {
              postsData.results.forEach(item => {
                if (type && item.type !== type && !(type === 'ai_content' && item.generated_output)) {
                  return;
                }
                const icon = item.type === 'tweet' ? '🐦' : item.type === 'youtube_video' ? '📹' : '✨';
                results.push({
                  type: item.type || 'content',
                  icon,
                  title: item.original_text || item.title || 'Untitled',
                  date: new Date(item.created_at),
                  url: item.type === 'tweet' ? '/dashboard/memories' : '/dashboard/ai-content'
                });
              });
            }
          }

          // Filter by date
          if (dateFilter) {
            const now = new Date();
            const filterDate = new Date();
            if (dateFilter === 'today') {
              filterDate.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'week') {
              filterDate.setDate(now.getDate() - 7);
            } else if (dateFilter === 'month') {
              filterDate.setMonth(now.getMonth() - 1);
            }
            results.filter(r => r.date >= filterDate);
          }

          // Sort by date
          results.sort((a, b) => b.date - a.date);

          if (results.length > 0) {
            searchResults.innerHTML = results.slice(0, 10).map(item => \`
              <a href="\${item.url}" class="search-result-item">
                <span class="search-result-icon">\${item.icon}</span>
                <div class="search-result-content">
                  <div class="search-result-title">\${item.title}</div>
                  <div class="search-result-meta">
                    \${item.type.replace(/_/g, ' ')} · \${item.date.toLocaleDateString()}
                  </div>
                </div>
              </a>
            \`).join('');
          } else {
            searchResults.innerHTML = '<p class="text-muted text-small">No results found</p>';
          }
        } catch (error) {
          console.error('Search error:', error);
          searchResults.innerHTML = '<p class="text-muted text-small">Search failed. Please try again.</p>';
        }
      }

      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
      });

      searchType.addEventListener('change', performSearch);
      searchDate.addEventListener('change', performSearch);
    </script>
  `;

  return baseLayout({
    title: 'Dashboard - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
