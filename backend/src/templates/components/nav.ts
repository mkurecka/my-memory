/**
 * Navigation component
 * Provides consistent navigation across all dashboard pages
 */

export interface NavProps {
  currentPage: string;
  apiBase: string;
}

export function nav({ currentPage, apiBase }: NavProps): string {
  const linkGroups = [
    {
      label: 'Content',
      links: [
        { path: '/dashboard', label: 'Overview', icon: '📊' },
        { path: '/dashboard/memories', label: 'Memories', icon: '🧠' },
        { path: '/dashboard/ai-content', label: 'AI Content', icon: '✨' },
      ]
    },
    {
      label: 'Create',
      links: [
        { path: '/dashboard/add', label: 'Add Content', icon: '➕' },
        { path: '/dashboard/ai-images', label: 'AI Images', icon: '🎨' },
        { path: '/dashboard/generate-carousel', label: 'Carousel', icon: '📱' },
      ]
    },
    {
      label: 'Admin',
      links: [
        { path: '/dashboard/claude-sessions', label: 'Claude', icon: '🤖' },
        { path: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
      ]
    }
  ];

  return `
    <nav class="dashboard-nav">
      <div class="nav-brand">
        <a href="/dashboard">🧠 My Memory</a>
      </div>
      <div class="nav-links">
        ${linkGroups.map((group, groupIndex) => `
          ${groupIndex > 0 ? '<div class="nav-separator"></div>' : ''}
          <div class="nav-group">
            ${group.links.map(link => `
              <a href="${link.path}" class="nav-link ${currentPage === link.path ? 'active' : ''}">
                <span class="nav-icon">${link.icon}</span>
                <span class="nav-label">${link.label}</span>
              </a>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </nav>

    <style>
      .dashboard-nav {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 0 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 60px;
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .nav-brand a {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--primary);
        text-decoration: none;
      }

      .nav-links {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .nav-group {
        display: flex;
        gap: 0.5rem;
      }

      .nav-separator {
        width: 1px;
        height: 24px;
        background: var(--border);
        margin: 0 0.5rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
      }

      .nav-link:hover {
        background: var(--background);
        color: var(--text-primary);
      }

      .nav-link.active {
        background: var(--primary-light);
        color: var(--primary);
      }

      .nav-icon {
        font-size: 1rem;
      }

      @media (max-width: 968px) {
        .dashboard-nav {
          padding: 0 1rem;
        }

        .nav-links {
          gap: 0.25rem;
        }

        .nav-group {
          gap: 0.25rem;
        }

        .nav-separator {
          margin: 0 0.25rem;
        }

        .nav-link {
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
        }
      }

      @media (max-width: 768px) {
        .dashboard-nav {
          padding: 0 1rem;
          flex-direction: column;
          height: auto;
          padding: 1rem;
        }

        .nav-links {
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
          gap: 0.5rem;
        }

        .nav-group {
          flex-wrap: wrap;
          justify-content: center;
        }

        .nav-separator {
          display: none;
        }

        .nav-link {
          padding: 0.5rem 0.75rem;
        }

        .nav-label {
          display: none;
        }
      }
    </style>
  `;
}
