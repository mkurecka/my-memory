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
        { path: '/dashboard/all-content', label: 'All Content', icon: '📚' },
        { path: '/dashboard/memories', label: 'Memories', icon: '🧠' },
        { path: '/dashboard/insights', label: 'Insights', icon: '💡' },
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
        { path: '/dashboard/chat', label: 'Chat', icon: '💬' },
        { path: '/dashboard/tasks', label: 'Tasks', icon: '📋' },
        { path: '/dashboard/etsy', label: 'Etsy', icon: '🏪' },
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

      <!-- Mobile Menu Toggle -->
      <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle menu">
        <span class="hamburger"></span>
        <span class="hamburger"></span>
        <span class="hamburger"></span>
      </button>

      <div class="nav-links" id="nav-links">
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

    <script>
      // Mobile menu toggle
      (function() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const navLinks = document.getElementById('nav-links');

        if (toggle && navLinks) {
          toggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            toggle.classList.toggle('active');
            document.body.classList.toggle('nav-open');
          });

          // Close menu when clicking a link
          navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
              navLinks.classList.remove('active');
              toggle.classList.remove('active');
              document.body.classList.remove('nav-open');
            });
          });

          // Close menu when clicking outside
          document.addEventListener('click', function(e) {
            if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
              navLinks.classList.remove('active');
              toggle.classList.remove('active');
              document.body.classList.remove('nav-open');
            }
          });
        }
      })();
    </script>

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

      /* Mobile Menu Toggle */
      .mobile-menu-toggle {
        display: none;
        flex-direction: column;
        justify-content: space-around;
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        z-index: 101;
      }

      .hamburger {
        width: 100%;
        height: 3px;
        background: var(--text-primary);
        border-radius: 2px;
        transition: all 0.3s;
      }

      .mobile-menu-toggle.active .hamburger:nth-child(1) {
        transform: rotate(45deg) translate(8px, 8px);
      }

      .mobile-menu-toggle.active .hamburger:nth-child(2) {
        opacity: 0;
      }

      .mobile-menu-toggle.active .hamburger:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -7px);
      }

      /* Prevent body scroll when menu is open */
      body.nav-open {
        overflow: hidden;
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
          padding: 1rem;
          height: 60px;
        }

        .mobile-menu-toggle {
          display: flex;
        }

        .nav-links {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--surface);
          flex-direction: column;
          align-items: stretch;
          padding: 1.5rem 1rem;
          gap: 1rem;
          transform: translateX(-100%);
          transition: transform 0.3s ease-in-out;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
        }

        .nav-links.active {
          transform: translateX(0);
        }

        .nav-group {
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-separator {
          width: 100%;
          height: 1px;
          background: var(--border);
          margin: 0.5rem 0;
        }

        .nav-link {
          padding: 0.875rem 1rem;
          border-radius: 8px;
          font-size: 1rem;
          justify-content: flex-start;
        }

        .nav-label {
          display: inline;
        }

        .nav-icon {
          font-size: 1.25rem;
        }
      }
    </style>
  `;
}
