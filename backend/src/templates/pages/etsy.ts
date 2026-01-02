import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';

export interface EtsySummary {
  products: number;
  images: number;
  listings: number;
  activeListings: number;
}

export interface EtsyPageProps {
  apiBase: string;
  isConfigured?: boolean;
  summary?: EtsySummary | null;
}

export function etsyPage({ apiBase, isConfigured = true, summary }: EtsyPageProps) {
  return baseLayout({
    title: 'Etsy Management',
    content: `
    ${nav({ currentPage: '/dashboard/etsy', apiBase })}

    <div class="container">
    <div class="page-header">
      <div>
        <h1>🛍️ Etsy Management</h1>
        <p class="text-secondary">Manage your Etsy products, listings, and images from Airtable</p>
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
      <p>Please configure your Airtable API key in Settings to enable Etsy management.</p>
      <a href="/dashboard/settings" class="btn btn-primary mt-2">Go to Settings</a>
    </div>
    ` : ''}

    <!-- Stats Cards -->
    <div class="stats-grid" id="statsContainer">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-value" id="productsCount">${summary?.products ?? '-'}</div>
          <div class="stat-label">Products</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <div class="stat-value" id="listingsCount">${summary?.listings ?? '-'}</div>
          <div class="stat-label">Listings</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🖼️</div>
        <div class="stat-content">
          <div class="stat-value" id="imagesCount">${summary?.images ?? '-'}</div>
          <div class="stat-label">Images</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value" id="activeListingsCount">${summary?.activeListings ?? '-'}</div>
          <div class="stat-label">Active Listings</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs">
        <button class="tab active" data-tab="listings" onclick="switchTab('listings')">
          🏷️ Listings
        </button>
        <button class="tab" data-tab="products" onclick="switchTab('products')">
          📦 Products
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

      .tabs-container {
        margin-bottom: 1.5rem;
      }

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
        -webkit-line-clamp: 2;
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

      .modal-lg {
        max-width: 800px;
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
        font-weight: 700;
        margin: 0;
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
      }

      .form-group {
        margin-bottom: 1.25rem;
      }

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

      .form-input:disabled {
        background: var(--background);
        color: var(--text-secondary);
      }

      textarea.form-input {
        min-height: 100px;
        resize: vertical;
      }

      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .image-thumbnail {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid var(--border);
        cursor: pointer;
        transition: all 0.2s;
      }

      .image-thumbnail:hover {
        border-color: var(--primary);
        transform: scale(1.05);
      }

      .field-value {
        padding: 0.75rem;
        background: var(--background);
        border-radius: 8px;
        font-size: 0.9375rem;
        word-break: break-word;
      }

      .price-badge {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--success);
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

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

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

      .badge-success {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }

      .badge-warning {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }

      .badge-primary {
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
      }

      .badge-ghost {
        background: var(--background);
        color: var(--text-secondary);
      }

      .empty-state {
        text-align: center;
        padding: 3rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
      }

      .empty-state-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
    </style>

    <!-- JSZip for downloading images as ZIP -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <!-- jsPDF for generating printable PDFs -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <script>
      const API_BASE = window.location.origin;
      let currentTab = 'listings';
      let cachedData = {
        listings: null,
        products: null,
        images: null
      };

      // Current filter state
      let currentProductFilter = 'all';

      // Load initial data
      async function loadSummary() {
        try {
          const response = await fetch(API_BASE + '/api/etsy/summary');
          const data = await response.json();

          if (data.success) {
            document.getElementById('productsCount').textContent = data.data.products;
            document.getElementById('listingsCount').textContent = data.data.listings;
            document.getElementById('imagesCount').textContent = data.data.images;
            document.getElementById('activeListingsCount').textContent = data.data.activeListings;
          }
        } catch (error) {
          console.error('Error loading summary:', error);
        }
      }

      async function loadListings(forceRefresh = false) {
        if (cachedData.listings && !forceRefresh) {
          renderListings(cachedData.listings);
          return;
        }

        try {
          const response = await fetch(API_BASE + '/api/etsy/listings');
          const data = await response.json();

          if (data.success) {
            cachedData.listings = data.data;
            renderListings(data.data);
          }
        } catch (error) {
          console.error('Error loading listings:', error);
          showError('Failed to load listings');
        }
      }

      async function loadProducts(forceRefresh = false) {
        if (cachedData.products && !forceRefresh) {
          renderProducts(cachedData.products);
          return;
        }

        try {
          const response = await fetch(API_BASE + '/api/etsy/products');
          const data = await response.json();

          if (data.success) {
            cachedData.products = data.data;
            renderProducts(data.data);
          }
        } catch (error) {
          console.error('Error loading products:', error);
          showError('Failed to load products');
        }
      }

      async function loadImages(forceRefresh = false) {
        if (cachedData.images && !forceRefresh) {
          renderImages(cachedData.images);
          return;
        }

        try {
          const response = await fetch(API_BASE + '/api/etsy/images');
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

      function renderListings(listings) {
        const container = document.getElementById('tabContent');

        if (!listings || listings.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">🏷️</div>
              <h3>No listings found</h3>
              <p class="text-secondary">Your Etsy listings will appear here</p>
            </div>
          \`;
          return;
        }

        container.innerHTML = \`
          <div class="items-grid">
            \${listings.map(listing => \`
              <div class="item-card" onclick="viewListing('\${listing.id}')">
                <div class="item-header">
                  <h3 class="item-title">\${escapeHtml(listing.title || 'Untitled')}</h3>
                  \${listing.price ? '<span class="price-badge">$' + listing.price + '</span>' : ''}
                </div>
                \${listing.description ? '<p class="item-description">' + escapeHtml(listing.description) + '</p>' : ''}
                <div class="item-meta">
                  <span class="badge \${getStatusBadge(listing.status)}">\${listing.status || 'Unknown'}</span>
                  \${listing.quantity ? '<span class="badge badge-ghost">Qty: ' + listing.quantity + '</span>' : ''}
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      }

      function renderProducts(products) {
        const container = document.getElementById('tabContent');

        if (!products || products.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <h3>No products found</h3>
              <p class="text-secondary">Your Etsy products will appear here</p>
            </div>
          \`;
          return;
        }

        // Extract unique status values from products
        const statusValues = [...new Set(products.map(p => p.status).filter(Boolean))];

        // Filter products based on current filter
        const filteredProducts = currentProductFilter === 'all'
          ? products
          : products.filter(p => (p.status || '').toLowerCase() === currentProductFilter.toLowerCase());

        container.innerHTML = \`
          <div class="flex justify-between mb-4" style="align-items: center; flex-wrap: wrap; gap: 1rem;">
            <p class="text-secondary">\${filteredProducts.length} of \${products.length} products</p>
            <div class="flex gap-2" style="align-items: center;">
              <label style="color: var(--text-secondary); font-size: 0.875rem;">Status:</label>
              <select id="productStatusFilter" onchange="filterProductsByStatus(this.value)" class="form-select" style="min-width: 140px;">
                <option value="all" \${currentProductFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="idea" \${currentProductFilter === 'idea' ? 'selected' : ''}>💡 Idea</option>
                <option value="generating" \${currentProductFilter === 'generating' ? 'selected' : ''}>⏳ Generating</option>
                <option value="completed" \${currentProductFilter === 'completed' ? 'selected' : ''}>✅ Completed</option>
                \${statusValues.filter(s => !['idea', 'generating', 'completed'].includes(s.toLowerCase())).map(s =>
                  '<option value="' + escapeHtml(s.toLowerCase()) + '" ' + (currentProductFilter === s.toLowerCase() ? 'selected' : '') + '>' + escapeHtml(s) + '</option>'
                ).join('')}
              </select>
            </div>
          </div>
          \${filteredProducts.length === 0 ? \`
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>No products match filter</h3>
              <p class="text-secondary">Try selecting a different status filter</p>
            </div>
          \` : \`
            <div class="items-grid">
              \${filteredProducts.map(product => \`
                <div class="item-card" onclick="viewProduct('\${product.id}')">
                  <div class="item-header">
                    <h3 class="item-title">\${escapeHtml(product.name || 'Untitled')}</h3>
                  </div>
                  \${product.niche ? '<p class="item-description">' + escapeHtml(product.niche) + '</p>' : ''}
                  <div class="item-meta">
                    \${product.productType ? '<span class="badge badge-primary">' + escapeHtml(product.productType) + '</span>' : ''}
                    \${product.style ? '<span class="badge badge-ghost">' + escapeHtml(product.style) + '</span>' : ''}
                    \${product.status ? '<span class="badge ' + getStatusBadge(product.status) + '">' + product.status + '</span>' : ''}
                  </div>
                </div>
              \`).join('')}
            </div>
          \`}
        \`;
      }

      function filterProductsByStatus(status) {
        currentProductFilter = status;
        if (cachedData.products) {
          renderProducts(cachedData.products);
        }
      }

      function renderImages(images) {
        const container = document.getElementById('tabContent');

        if (!images || images.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-state-icon">🖼️</div>
              <h3>No images found</h3>
              <p class="text-secondary">Your product images will appear here</p>
            </div>
          \`;
          return;
        }

        const imagesWithUrl = images.filter(img => img.url || img.thumbnailUrl);

        container.innerHTML = \`
          <div class="flex justify-between mb-4" style="align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <p class="text-secondary">\${images.length} images (\${imagesWithUrl.length} with URLs)</p>
            <div class="flex gap-2" style="align-items: center;">
              <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; color: var(--text-secondary);">
                <input type="checkbox" id="pdfGrayscale" style="width: 16px; height: 16px; cursor: pointer;">
                <span>B&W</span>
              </label>
              <button onclick="generateAllImagesPDF()" class="btn btn-secondary" id="generatePdfBtn" \${imagesWithUrl.length === 0 ? 'disabled' : ''}>
                <span>📄</span> Generate PDF
              </button>
              <button onclick="downloadAllImages()" class="btn btn-primary" id="downloadAllBtn" \${imagesWithUrl.length === 0 ? 'disabled' : ''}>
                <span>📥</span> Download as ZIP
              </button>
            </div>
          </div>
          <div id="downloadProgress" style="display: none; margin-bottom: 1rem;">
            <div style="background: var(--background); border-radius: 8px; overflow: hidden; height: 8px;">
              <div id="progressBar" style="background: var(--primary); height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
            <p class="text-secondary mt-2" id="progressText">Preparing download...</p>
          </div>
          <div class="items-grid">
            \${images.map(image => {
              const imgUrl = image.thumbnailUrl || image.url;
              return \`
              <div class="item-card" onclick="viewImage('\${image.id}')">
                \${imgUrl ? '<img src="' + escapeHtml(imgUrl) + '" class="item-preview" alt="' + escapeHtml(image.name) + '" onerror="this.src=\\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22>No image</text></svg>\\'"/>' : '<div class="item-preview" style="display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">No preview</div>'}
                <div class="item-header">
                  <h3 class="item-title">\${escapeHtml(image.name || 'Untitled')}</h3>
                </div>
                <div class="item-meta">
                  \${image.generationStatus ? '<span class="badge ' + getStatusBadge(image.generationStatus) + '">' + image.generationStatus + '</span>' : ''}
                  \${image.modelUsed ? '<span class="badge badge-ghost">' + escapeHtml(image.modelUsed) + '</span>' : ''}
                </div>
              </div>
            \`}).join('')}
          </div>
        \`;
      }

      async function viewListing(id) {
        try {
          const response = await fetch(API_BASE + '/api/etsy/listings/' + id);
          const data = await response.json();

          if (!data.success) throw new Error(data.error);

          const listing = data.data;
          document.getElementById('modalTitle').textContent = '🏷️ Listing Details';
          document.getElementById('modalContent').innerHTML = \`
            <div>
              <div class="form-group">
                <label>Title</label>
                <input type="text" class="form-input" id="edit_title" value="\${escapeHtml(listing.title || '')}">
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea class="form-input" id="edit_description">\${escapeHtml(listing.description || '')}</textarea>
              </div>
              <div class="form-group">
                <label>Price</label>
                <input type="number" class="form-input" id="edit_price" value="\${listing.price || ''}" step="0.01">
              </div>
              <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="form-input" id="edit_quantity" value="\${listing.quantity || ''}">
              </div>
              <div class="form-group">
                <label>Status</label>
                <input type="text" class="form-input" id="edit_status" value="\${escapeHtml(listing.status || '')}">
              </div>
              \${listing.etsyUrl ? \`
                <div class="form-group">
                  <label>Etsy URL</label>
                  <div class="field-value">
                    <a href="\${escapeHtml(listing.etsyUrl)}" target="_blank">\${escapeHtml(listing.etsyUrl)}</a>
                  </div>
                </div>
              \` : ''}
              <div class="flex gap-2 justify-end mt-4">
                <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                <button onclick="saveListing('\${id}')" class="btn btn-primary">Save Changes</button>
              </div>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          console.error('Error loading listing:', error);
          alert('Failed to load listing: ' + error.message);
        }
      }

      async function viewProduct(id) {
        try {
          const response = await fetch(API_BASE + '/api/etsy/products/' + id);
          const data = await response.json();

          if (!data.success) throw new Error(data.error);

          const product = data.data;
          const images = product.productImages || [];

          document.getElementById('modalTitle').textContent = '📦 Product Details';
          document.getElementById('modalContent').innerHTML = \`
            <div>
              <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-input" id="edit_name" value="\${escapeHtml(product.name || '')}">
              </div>
              <div class="form-group">
                <label>Niche</label>
                <input type="text" class="form-input" id="edit_niche" value="\${escapeHtml(product.niche || '')}">
              </div>
              <div class="form-group">
                <label>Style</label>
                <input type="text" class="form-input" id="edit_style" value="\${escapeHtml(product.style || '')}">
              </div>
              <div class="form-group">
                <label>Product Type</label>
                <input type="text" class="form-input" id="edit_productType" value="\${escapeHtml(product.productType || '')}">
              </div>
              <div class="form-group">
                <label>Status</label>
                <input type="text" class="form-input" id="edit_status" value="\${escapeHtml(product.status || '')}">
              </div>
              <div class="form-group">
                <label>Priority</label>
                <input type="text" class="form-input" id="edit_priority" value="\${escapeHtml(product.priority || '')}">
              </div>
              <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="form-input" id="edit_quantity" value="\${product.quantity || ''}">
              </div>
              <div class="form-group">
                <label>Notes</label>
                <textarea class="form-input" id="edit_notes">\${escapeHtml(product.notes || '')}</textarea>
              </div>
              \${images.length > 0 ? \`
                <div class="form-group">
                  <label>Product Images (\${images.length})</label>
                  <div class="flex gap-2" style="margin-left: 1rem; display: inline-flex; align-items: center;">
                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; color: var(--text-secondary);">
                      <input type="checkbox" id="productPdfGrayscale" style="width: 16px; height: 16px; cursor: pointer;">
                      <span>B&W</span>
                    </label>
                    <button onclick="generateProductPDF('\${id}', '\${escapeHtml(product.name || 'product')}')" class="btn btn-secondary btn-sm">
                      <span>📄</span> Generate PDF
                    </button>
                    <button onclick="downloadProductImages('\${id}', '\${escapeHtml(product.name || 'product')}')" class="btn btn-secondary btn-sm">
                      <span>📥</span> Download ZIP
                    </button>
                  </div>
                  <div class="image-grid">
                    \${images.map(img => \`
                      <img src="\${escapeHtml(img.thumbnailUrl || img.url || '')}" class="image-thumbnail" alt="\${escapeHtml(img.name || '')}" onclick="viewImage('\${img.id}')" onerror="this.style.display='none'">
                    \`).join('')}
                  </div>
                  <div id="productDownloadProgress" style="display: none; margin-top: 1rem;">
                    <div style="background: var(--background); border-radius: 8px; overflow: hidden; height: 8px;">
                      <div id="productProgressBar" style="background: var(--primary); height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <p class="text-secondary mt-2" id="productProgressText">Preparing download...</p>
                  </div>
                </div>
              \` : ''}
              <div class="flex gap-2 justify-end mt-4">
                <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                <button onclick="saveProduct('\${id}')" class="btn btn-primary">Save Changes</button>
              </div>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          console.error('Error loading product:', error);
          alert('Failed to load product: ' + error.message);
        }
      }

      async function viewImage(id) {
        try {
          const response = await fetch(API_BASE + '/api/etsy/images/' + id);
          const data = await response.json();

          if (!data.success) throw new Error(data.error);

          const image = data.data;
          const imgUrl = image.url || image.thumbnailUrl;
          document.getElementById('modalTitle').textContent = '🖼️ Image Details';
          document.getElementById('modalContent').innerHTML = \`
            <div>
              \${imgUrl ? '<img src="' + escapeHtml(imgUrl) + '" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 1rem;" alt="' + escapeHtml(image.name) + '">' : ''}
              <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-input" id="edit_name" value="\${escapeHtml(image.name || '')}">
              </div>
              <div class="form-group">
                <label>Prompt</label>
                <textarea class="form-input" id="edit_prompt">\${escapeHtml(image.prompt || '')}</textarea>
              </div>
              <div class="form-group">
                <label>Generation Status</label>
                <input type="text" class="form-input" id="edit_generationStatus" value="\${escapeHtml(image.generationStatus || '')}">
              </div>
              <div class="form-group">
                <label>Model Used</label>
                <input type="text" class="form-input" id="edit_modelUsed" value="\${escapeHtml(image.modelUsed || '')}" disabled>
              </div>
              \${image.cost ? \`
              <div class="form-group">
                <label>Cost</label>
                <div class="field-value">$\${image.cost.toFixed(4)}</div>
              </div>
              \` : ''}
              \${image.replicateId ? \`
              <div class="form-group">
                <label>Replicate ID</label>
                <div class="field-value" style="font-family: monospace; font-size: 0.8rem;">\${escapeHtml(image.replicateId)}</div>
              </div>
              \` : ''}
              <div class="flex gap-2 justify-end mt-4">
                <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                <button onclick="saveImage('\${id}')" class="btn btn-primary">Save Changes</button>
              </div>
            </div>
          \`;
          document.getElementById('detailModal').style.display = 'flex';
        } catch (error) {
          console.error('Error loading image:', error);
          alert('Failed to load image: ' + error.message);
        }
      }

      async function saveListing(id) {
        const updates = {
          Title: document.getElementById('edit_title').value,
          Description: document.getElementById('edit_description').value,
          Price: parseFloat(document.getElementById('edit_price').value) || null,
          Quantity: parseInt(document.getElementById('edit_quantity').value) || null,
          Status: document.getElementById('edit_status').value
        };

        await saveItem('listings', id, updates);
      }

      async function saveProduct(id) {
        const updates = {
          Name: document.getElementById('edit_name').value,
          Niche: document.getElementById('edit_niche').value,
          Style: document.getElementById('edit_style').value,
          'Product Type': document.getElementById('edit_productType').value,
          Status: document.getElementById('edit_status').value,
          Priority: document.getElementById('edit_priority').value,
          Quantity: parseInt(document.getElementById('edit_quantity').value) || null,
          Notes: document.getElementById('edit_notes').value
        };

        await saveItem('products', id, updates);
      }

      async function saveImage(id) {
        const updates = {
          Name: document.getElementById('edit_name').value,
          Prompt: document.getElementById('edit_prompt').value,
          'Generation Status': document.getElementById('edit_generationStatus').value
        };

        await saveItem('images', id, updates);
      }

      async function saveItem(type, id, updates) {
        try {
          const response = await fetch(API_BASE + '/api/etsy/' + type + '/' + id, {
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
          console.error('Error saving:', error);
          alert('Failed to save: ' + error.message);
        }
      }

      function switchTab(tab) {
        currentTab = tab;

        // Update tab styles
        document.querySelectorAll('.tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Show loading
        document.getElementById('tabContent').innerHTML = \`
          <div class="text-center py-8">
            <div class="loading-spinner"></div>
            <p class="text-secondary mt-4">Loading...</p>
          </div>
        \`;

        // Load data
        if (tab === 'listings') loadListings();
        else if (tab === 'products') loadProducts();
        else if (tab === 'images') loadImages();
      }

      function closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('detailModal').style.display = 'none';
      }

      function refreshData() {
        cachedData = { listings: null, products: null, images: null };
        loadSummary();
        switchTab(currentTab);
      }

      function showError(message) {
        document.getElementById('tabContent').innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <h3>Error</h3>
            <p class="text-secondary">\${escapeHtml(message)}</p>
            <button onclick="refreshData()" class="btn btn-primary mt-4">Retry</button>
          </div>
        \`;
      }

      function getStatusBadge(status) {
        if (!status) return 'badge-ghost';
        const s = status.toLowerCase();
        if (s === 'active' || s === 'done' || s === 'complete') return 'badge-success';
        if (s === 'pending' || s === 'draft') return 'badge-warning';
        return 'badge-ghost';
      }

      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function downloadAllImages() {
        const images = cachedData.images;
        if (!images || images.length === 0) {
          alert('No images to download');
          return;
        }

        const imagesWithUrl = images.filter(img => img.url || img.thumbnailUrl);
        if (imagesWithUrl.length === 0) {
          alert('No images have URLs to download');
          return;
        }

        const btn = document.getElementById('downloadAllBtn');
        const progressDiv = document.getElementById('downloadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Downloading...';
        progressDiv.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing download...';

        try {
          const zip = new JSZip();
          const folder = zip.folder('etsy-images');
          let downloaded = 0;
          let failed = 0;

          for (const image of imagesWithUrl) {
            const imageUrl = image.url || image.thumbnailUrl;
            const fileName = (image.name || 'image_' + image.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '.png';

            progressText.textContent = \`Downloading \${downloaded + 1}/\${imagesWithUrl.length}: \${image.name || 'image'}\`;

            try {
              // Use fetch to get the image as blob
              const response = await fetch(imageUrl);
              if (!response.ok) throw new Error('HTTP ' + response.status);

              const blob = await response.blob();
              folder.file(fileName, blob);
              downloaded++;
            } catch (err) {
              console.error('Failed to download:', imageUrl, err);
              failed++;
            }

            const progress = ((downloaded + failed) / imagesWithUrl.length) * 100;
            progressBar.style.width = progress + '%';
          }

          progressText.textContent = 'Creating ZIP file...';

          // Generate the ZIP file
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          }, (metadata) => {
            progressBar.style.width = metadata.percent + '%';
          });

          // Create download link
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'etsy-images-' + new Date().toISOString().split('T')[0] + '.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          progressText.textContent = \`Done! Downloaded \${downloaded} images\${failed > 0 ? ' (' + failed + ' failed)' : ''}\`;

          setTimeout(() => {
            progressDiv.style.display = 'none';
            btn.disabled = false;
            btn.innerHTML = '<span>📥</span> Download All as ZIP';
          }, 3000);

        } catch (error) {
          console.error('Error creating ZIP:', error);
          alert('Failed to create ZIP: ' + error.message);
          progressDiv.style.display = 'none';
          btn.disabled = false;
          btn.innerHTML = '<span>📥</span> Download All as ZIP';
        }
      }

      async function downloadProductImages(productId, productName) {
        try {
          // Fetch product details to get images
          const response = await fetch(API_BASE + '/api/etsy/products/' + productId);
          const data = await response.json();

          if (!data.success) throw new Error(data.error);

          const images = data.data.productImages || [];
          const imagesWithUrl = images.filter(img => img.url || img.thumbnailUrl);

          if (imagesWithUrl.length === 0) {
            alert('No images to download for this product');
            return;
          }

          const progressDiv = document.getElementById('productDownloadProgress');
          const progressBar = document.getElementById('productProgressBar');
          const progressText = document.getElementById('productProgressText');

          if (progressDiv) {
            progressDiv.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = 'Preparing download...';
          }

          const zip = new JSZip();
          const folderName = productName.replace(/[^a-zA-Z0-9_-]/g, '_');
          const folder = zip.folder(folderName);
          let downloaded = 0;
          let failed = 0;

          for (const image of imagesWithUrl) {
            const imageUrl = image.url || image.thumbnailUrl;
            const fileName = (image.name || 'image_' + image.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '.png';

            if (progressText) {
              progressText.textContent = \`Downloading \${downloaded + 1}/\${imagesWithUrl.length}\`;
            }

            try {
              const imgResponse = await fetch(imageUrl);
              if (!imgResponse.ok) throw new Error('HTTP ' + imgResponse.status);

              const blob = await imgResponse.blob();
              folder.file(fileName, blob);
              downloaded++;
            } catch (err) {
              console.error('Failed to download:', imageUrl, err);
              failed++;
            }

            if (progressBar) {
              const progress = ((downloaded + failed) / imagesWithUrl.length) * 100;
              progressBar.style.width = progress + '%';
            }
          }

          if (progressText) {
            progressText.textContent = 'Creating ZIP file...';
          }

          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });

          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = folderName + '-images.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (progressText) {
            progressText.textContent = \`Done! Downloaded \${downloaded} images\${failed > 0 ? ' (' + failed + ' failed)' : ''}\`;
          }

          setTimeout(() => {
            if (progressDiv) progressDiv.style.display = 'none';
          }, 3000);

        } catch (error) {
          console.error('Error downloading product images:', error);
          alert('Failed to download: ' + error.message);
          const progressDiv = document.getElementById('productDownloadProgress');
          if (progressDiv) progressDiv.style.display = 'none';
        }
      }

      // Generate PDF for a specific product's images
      async function generateProductPDF(productId, productName) {
        try {
          const grayscale = document.getElementById('productPdfGrayscale')?.checked || false;

          const response = await fetch(API_BASE + '/api/etsy/products/' + productId);
          const data = await response.json();

          if (!data.success) throw new Error(data.error);

          const images = data.data.productImages || [];
          const imagesWithUrl = images.filter(img => img.url || img.thumbnailUrl);

          if (imagesWithUrl.length === 0) {
            alert('No images to generate PDF for this product');
            return;
          }

          await createPDFFromImages(imagesWithUrl, productName, grayscale);
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF: ' + error.message);
        }
      }

      // Generate PDF for all images
      async function generateAllImagesPDF() {
        const btn = document.getElementById('generatePdfBtn');
        const grayscale = document.getElementById('pdfGrayscale')?.checked || false;

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span>⏳</span> Generating...';
        }

        try {
          const images = cachedData.images || [];
          const imagesWithUrl = images.filter(img => img.url || img.thumbnailUrl);

          if (imagesWithUrl.length === 0) {
            alert('No images to generate PDF');
            return;
          }

          await createPDFFromImages(imagesWithUrl, 'all-images', grayscale);
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF: ' + error.message);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>📄</span> Generate PDF';
          }
        }
      }

      // Convert image to grayscale using canvas
      function convertToGrayscale(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Use luminosity formula for more natural grayscale
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;     // Red
          data[i + 1] = gray; // Green
          data[i + 2] = gray; // Blue
          // Alpha channel (data[i + 3]) remains unchanged
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
      }

      // Create PDF with one image per A4 page with safe print margins
      async function createPDFFromImages(images, filename, grayscale = false) {
        const { jsPDF } = window.jspdf;

        // A4 dimensions in mm
        const pageWidth = 210;
        const pageHeight = 297;

        // Safe print margins (15mm on each side)
        const margin = 15;
        const printableWidth = pageWidth - (margin * 2);
        const printableHeight = pageHeight - (margin * 2);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const progressDiv = document.getElementById('downloadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (progressDiv) {
          progressDiv.style.display = 'block';
          progressBar.style.width = '0%';
          progressText.textContent = grayscale ? 'Generating B&W PDF...' : 'Generating PDF...';
        }

        let processed = 0;
        let failed = 0;

        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const imageUrl = image.url || image.thumbnailUrl;

          if (progressText) {
            progressText.textContent = \`Processing image \${i + 1}/\${images.length}\${grayscale ? ' (B&W)' : ''}...\`;
          }

          try {
            // Fetch image as blob and convert to base64
            const imgResponse = await fetch(imageUrl);
            if (!imgResponse.ok) throw new Error('HTTP ' + imgResponse.status);

            const blob = await imgResponse.blob();
            let base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            // Add new page for each image (except first)
            if (i > 0) {
              pdf.addPage();
            }

            // Load image to get dimensions and optionally convert to grayscale
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = base64;
            });

            // Convert to grayscale if requested
            if (grayscale) {
              base64 = convertToGrayscale(img);
            }

            const imgWidth = img.width;
            const imgHeight = img.height;
            const aspectRatio = imgWidth / imgHeight;

            let finalWidth, finalHeight;

            // Fit image within printable area maintaining aspect ratio
            if (aspectRatio > printableWidth / printableHeight) {
              // Image is wider than printable area
              finalWidth = printableWidth;
              finalHeight = printableWidth / aspectRatio;
            } else {
              // Image is taller than printable area
              finalHeight = printableHeight;
              finalWidth = printableHeight * aspectRatio;
            }

            // Center the image on the page
            const x = margin + (printableWidth - finalWidth) / 2;
            const y = margin + (printableHeight - finalHeight) / 2;

            // Add image to PDF
            pdf.addImage(base64, 'PNG', x, y, finalWidth, finalHeight);
            processed++;
          } catch (err) {
            console.error('Failed to add image to PDF:', imageUrl, err);
            failed++;
            // Add a placeholder page for failed images
            if (i > 0) {
              pdf.addPage();
            }
            pdf.setFontSize(12);
            pdf.text('Image failed to load: ' + (image.name || 'Unknown'), margin, margin + 10);
          }

          if (progressBar) {
            const progress = ((i + 1) / images.length) * 100;
            progressBar.style.width = progress + '%';
          }
        }

        if (progressText) {
          progressText.textContent = 'Saving PDF...';
        }

        // Generate safe filename with B&W suffix if grayscale
        const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
        const suffix = grayscale ? '-bw-printable.pdf' : '-printable.pdf';
        pdf.save(safeFilename + suffix);

        if (progressText) {
          progressText.textContent = \`Done! Generated \${grayscale ? 'B&W ' : ''}PDF with \${processed} images\${failed > 0 ? ' (' + failed + ' failed)' : ''}\`;
        }

        setTimeout(() => {
          if (progressDiv) progressDiv.style.display = 'none';
        }, 3000);
      }

      // Initialize
      loadSummary();
      loadListings();
    </script>
    </div>
    `
  });
}
