/**
 * Base layout template
 * Provides HTML structure, meta tags, and global styles
 */

export interface BaseLayoutProps {
  title: string;
  content: string;
  styles?: string;
  scripts?: string;
}

export function baseLayout({ title, content, styles = '', scripts = '' }: BaseLayoutProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="My Memory 🧠 Dashboard">
  <title>${title}</title>

  <!-- Global Styles -->
  <style>
    :root {
      /* Brand Colors */
      --primary: #065f4a;
      --primary-dark: #054433;
      --primary-light: #dcfce7;
      --secondary: #10b981;

      /* Semantic Colors */
      --error: #ef4444;
      --error-light: #fee2e2;
      --success: #10b981;
      --success-light: #d1fae5;
      --warning: #f59e0b;
      --warning-light: #fef3c7;
      --info: #3b82f6;
      --info-light: #dbeafe;

      /* Neutral Palette */
      --background: #f9fafb;
      --surface: #ffffff;
      --surface-elevated: #ffffff;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --text-tertiary: #9ca3af;
      --border: #e5e7eb;
      --border-light: #f3f4f6;
      --divider: #e5e7eb;

      /* Shadows */
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
      --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
      --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);

      /* Spacing Scale */
      --space-xs: 0.25rem;
      --space-sm: 0.5rem;
      --space-md: 1rem;
      --space-lg: 1.5rem;
      --space-xl: 2rem;
      --space-2xl: 3rem;

      /* Border Radius */
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      --radius-full: 9999px;

      /* Transitions */
      --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

      /* Typography Scale */
      --text-xs: 0.75rem;
      --text-sm: 0.875rem;
      --text-base: 1rem;
      --text-lg: 1.125rem;
      --text-xl: 1.25rem;
      --text-2xl: 1.5rem;
      --text-3xl: 1.875rem;
      --text-4xl: 2.25rem;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--background);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      line-height: 1.2;
      color: var(--text-primary);
    }

    h1 { font-size: var(--text-4xl); }
    h2 { font-size: var(--text-3xl); }
    h3 { font-size: var(--text-2xl); }
    h4 { font-size: var(--text-xl); }
    h5 { font-size: var(--text-lg); }
    h6 { font-size: var(--text-base); }

    a {
      color: var(--primary);
      text-decoration: none;
      transition: color var(--transition-base);
    }

    a:hover {
      color: var(--primary-dark);
    }

    /* Button Base */
    button {
      cursor: pointer;
      border: none;
      background: none;
      font-family: inherit;
      transition: all var(--transition-base);
    }

    /* Button Variants */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: var(--text-sm);
      font-weight: 500;
      border-radius: var(--radius-md);
      transition: all var(--transition-base);
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      min-height: 44px;
      min-width: 44px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: var(--shadow-sm);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-dark);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }

    .btn-secondary {
      background: var(--background);
      color: var(--text-primary);
      border-color: var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--surface);
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
    }

    .btn-ghost:hover:not(:disabled) {
      background: var(--background);
      color: var(--text-primary);
    }

    .btn-success {
      background: var(--success);
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
      box-shadow: var(--shadow-md);
    }

    .btn-error {
      background: var(--error);
      color: white;
    }

    .btn-error:hover:not(:disabled) {
      background: #dc2626;
      box-shadow: var(--shadow-md);
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: var(--text-xs);
      min-height: 36px;
    }

    .btn-lg {
      padding: 1rem 2rem;
      font-size: var(--text-base);
      min-height: 52px;
    }

    /* Card Components */
    .card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
      border: 1px solid var(--border-light);
      transition: all var(--transition-base);
    }

    .card-title {
      font-size: var(--text-xl);
      font-weight: 600;
      margin-bottom: var(--space-md);
      color: var(--text-primary);
    }

    .card-elevated {
      box-shadow: var(--shadow-md);
    }

    .card-elevated:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-2px);
    }

    .card-interactive {
      cursor: pointer;
    }

    .card-interactive:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md);
    }

    .card-bordered {
      border: 2px solid var(--border);
      box-shadow: none;
    }

    .card-flat {
      box-shadow: none;
      border: none;
    }

    /* Grid System */
    .grid {
      display: grid;
      gap: 1.5rem;
    }

    .grid-2 {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .grid-3 {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .grid-4 {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    /* Form Elements */
    input[type="text"],
    input[type="email"],
    input[type="url"],
    input[type="number"],
    input[type="password"],
    input[type="search"],
    textarea,
    select {
      width: 100%;
      padding: 0.75rem;
      font-size: 16px; /* Prevents zoom on iOS */
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text-primary);
      transition: all var(--transition-base);
      font-family: inherit;
    }

    input:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--text-tertiary);
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    /* Badge/Chip Components */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .badge-primary {
      background: var(--primary-light);
      color: var(--primary-dark);
    }

    .badge-success {
      background: var(--success-light);
      color: #065f46;
    }

    .badge-error {
      background: var(--error-light);
      color: #991b1b;
    }

    .badge-warning {
      background: var(--warning-light);
      color: #92400e;
    }

    .badge-info {
      background: var(--info-light);
      color: #1e40af;
    }

    .badge-neutral {
      background: var(--border-light);
      color: var(--text-secondary);
    }

    /* Alert Components */
    .alert {
      padding: var(--space-md);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-md);
      border-left: 4px solid;
    }

    .alert-success {
      background: var(--success-light);
      border-color: var(--success);
      color: #065f46;
    }

    .alert-error {
      background: var(--error-light);
      border-color: var(--error);
      color: #991b1b;
    }

    .alert-warning {
      background: var(--warning-light);
      border-color: var(--warning);
      color: #92400e;
    }

    .alert-info {
      background: var(--info-light);
      border-color: var(--info);
      color: #1e40af;
    }

    /* Utility Classes */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-muted { color: var(--text-secondary); }
    .text-tertiary { color: var(--text-tertiary); }
    .text-small { font-size: var(--text-sm); }
    .text-xs { font-size: var(--text-xs); }
    .text-lg { font-size: var(--text-lg); }
    .font-bold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-normal { font-weight: 400; }

    /* Spacing Utilities */
    .m-0 { margin: 0; }
    .mb-1 { margin-bottom: var(--space-sm); }
    .mb-2 { margin-bottom: var(--space-md); }
    .mb-3 { margin-bottom: var(--space-lg); }
    .mt-1 { margin-top: var(--space-sm); }
    .mt-2 { margin-top: var(--space-md); }
    .mt-3 { margin-top: var(--space-lg); }
    .p-0 { padding: 0; }
    .p-1 { padding: var(--space-sm); }
    .p-2 { padding: var(--space-md); }
    .p-3 { padding: var(--space-lg); }

    /* Flex Utilities */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .gap-1 { gap: var(--space-sm); }
    .gap-2 { gap: var(--space-md); }
    .gap-3 { gap: var(--space-lg); }

    /* Loading States */
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid var(--border);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s linear infinite;
    }

    .loading-lg {
      width: 40px;
      height: 40px;
      border-width: 4px;
    }

    .loading-sm {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }

    /* Skeleton Loaders */
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--border-light) 0%,
        var(--border) 50%,
        var(--border-light) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-md);
    }

    .skeleton-text {
      height: 1rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-title {
      height: 1.5rem;
      width: 60%;
      margin-bottom: 1rem;
    }

    .skeleton-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .fade-in {
      animation: fadeIn var(--transition-slow) ease-out;
    }

    .slide-in {
      animation: slideIn var(--transition-slow) ease-out;
    }

    /* Interactive Elements */
    .hover-lift {
      transition: transform var(--transition-base);
    }

    .hover-lift:hover {
      transform: translateY(-2px);
    }

    .hover-scale {
      transition: transform var(--transition-base);
    }

    .hover-scale:hover {
      transform: scale(1.05);
    }

    /* Divider */
    .divider {
      height: 1px;
      background: var(--divider);
      margin: var(--space-lg) 0;
    }

    /* Status Indicators */
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      display: inline-block;
    }

    .status-dot-success { background: var(--success); }
    .status-dot-error { background: var(--error); }
    .status-dot-warning { background: var(--warning); }
    .status-dot-info { background: var(--info); }

    /* Responsive Breakpoints */
    @media (max-width: 1024px) {
      .container {
        max-width: 100%;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
      }

      h1 { font-size: 1.75rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; }

      .card {
        padding: 1.25rem;
        margin-bottom: 1rem;
      }
    }

    @media (max-width: 480px) {
      .container {
        padding: 0.75rem;
      }

      h1 { font-size: 1.5rem; }
      h2 { font-size: 1.25rem; }
      h3 { font-size: 1.125rem; }

      .card {
        padding: 1rem;
        border-radius: 8px;
      }

      button,
      .btn {
        width: 100%;
        justify-content: center;
      }
    }

    /* Touch-friendly interactions */
    @media (hover: none) and (pointer: coarse) {
      a, button {
        min-height: 44px;
        min-width: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }
  </style>

  ${styles}
</head>
<body>
  ${content}

  ${scripts}
</body>
</html>`;
}
