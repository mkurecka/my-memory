/**
 * Skeleton loading components
 * Provides placeholder content while data is loading
 */

/**
 * Card skeleton - for list items
 */
export function skeletonCard(): string {
  return `
    <div class="skeleton-card">
      <div class="skeleton-thumbnail"></div>
      <div class="skeleton-content">
        <div class="skeleton-header">
          <div class="skeleton-badge"></div>
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
        <div class="skeleton-meta">
          <div class="skeleton-meta-item"></div>
          <div class="skeleton-meta-item"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Grid skeleton - for multiple cards
 */
export function skeletonGrid(count: number = 3): string {
  return `
    <div class="skeleton-grid">
      ${Array(count).fill(0).map(() => skeletonCard()).join('')}
    </div>
  `;
}

/**
 * Table skeleton - for data tables
 */
export function skeletonTable(rows: number = 5): string {
  return `
    <div class="skeleton-table">
      ${Array(rows).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell short"></div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Skeleton styles - add this to your page styles
 */
export const skeletonStyles = `
  /* Skeleton Base */
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .skeleton-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .skeleton-card {
    background: var(--surface);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 1rem;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-thumbnail {
    width: 120px;
    height: 68px;
    border-radius: 8px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .skeleton-content {
    flex: 1;
    min-width: 0;
  }

  .skeleton-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .skeleton-badge {
    width: 60px;
    height: 20px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-title {
    flex: 1;
    height: 24px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-text {
    height: 16px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    margin-bottom: 0.5rem;
  }

  .skeleton-text.short {
    width: 70%;
  }

  .skeleton-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .skeleton-meta-item {
    width: 80px;
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  /* Table Skeleton */
  .skeleton-table {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .skeleton-row {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--surface);
    border-radius: 8px;
  }

  .skeleton-cell {
    height: 20px;
    flex: 1;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--background) 25%, #f0f0f0 50%, var(--background) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
  }

  .skeleton-cell.short {
    flex: 0.3;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-card,
    .skeleton-thumbnail,
    .skeleton-badge,
    .skeleton-title,
    .skeleton-text,
    .skeleton-meta-item,
    .skeleton-cell {
      animation: none;
    }
  }
`;
