/**
 * Unified AI Images page - generate new images and view all generated images
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';

export interface AIImagesPageProps {
  count: number;
  apiBase: string;
  userId: string;
}

export function aiImagesPage({ count, apiBase, userId }: AIImagesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/ai-images', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'AI Images',
        subtitle: 'Generate new AI images and view your gallery',
        icon: '🎨',
        count,
        backLink: '/dashboard'
      })}

      <!-- Generate Section (Collapsible) -->
      <div class="section-card">
        <div class="section-header" onclick="toggleGenerateSection()">
          <h3>✨ Generate New Image</h3>
          <span id="toggle-icon" class="toggle-icon">▼</span>
        </div>
        <div id="generate-section" class="generate-section">
          <div class="generate-layout">
            <!-- Form -->
            <div class="generate-form-wrapper">
              <form id="generate-form" class="content-form">
                <div class="form-group">
                  <label for="prompt">Prompt *</label>
                  <textarea id="prompt" name="prompt" rows="4" placeholder="Describe the image you want to generate..." required></textarea>
                  <span class="form-hint">Be specific and detailed for better results</span>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="model">Model</label>
                    <select id="model" name="model">
                      <option value="">Loading models...</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="style">Style</label>
                    <select id="style" name="style">
                      <option value="vivid">Vivid (dramatic, vibrant)</option>
                      <option value="natural">Natural (realistic, subtle)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label for="aspectRatio">Aspect Ratio</label>
                  <div class="aspect-ratio-grid">
                    <label class="aspect-option">
                      <input type="radio" name="aspectRatio" value="1:1" checked />
                      <span class="aspect-box square">1:1</span>
                    </label>
                    <label class="aspect-option">
                      <input type="radio" name="aspectRatio" value="16:9" />
                      <span class="aspect-box wide">16:9</span>
                    </label>
                    <label class="aspect-option">
                      <input type="radio" name="aspectRatio" value="9:16" />
                      <span class="aspect-box tall">9:16</span>
                    </label>
                    <label class="aspect-option">
                      <input type="radio" name="aspectRatio" value="4:3" />
                      <span class="aspect-box standard">4:3</span>
                    </label>
                    <label class="aspect-option">
                      <input type="radio" name="aspectRatio" value="3:4" />
                      <span class="aspect-box portrait">3:4</span>
                    </label>
                  </div>
                </div>

                <button type="submit" class="btn-primary btn-generate">
                  <span class="btn-text">🎨 Generate Image</span>
                  <span class="btn-loading hidden">⏳ Generating...</span>
                </button>
              </form>
            </div>

            <!-- Preview -->
            <div class="preview-wrapper">
              <div id="preview-container" class="preview-container">
                <div class="preview-placeholder">
                  <span class="preview-icon">🖼️</span>
                  <p>Generated image will appear here</p>
                </div>
              </div>

              <!-- Actions (hidden until image generated) -->
              <div id="image-actions" class="image-actions hidden">
                <a id="download-btn" href="#" download class="btn-secondary">⬇️ Download</a>
                <button id="copy-url-btn" class="btn-secondary">🔗 Copy URL</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gallery Section -->
      <div class="section-card">
        <div class="section-header-toolbar">
          <h3>🖼️ Image Gallery</h3>
          <div class="toolbar-actions">
            <select id="sort-select">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button id="refresh-btn" class="btn-secondary">🔄 Refresh</button>
          </div>
        </div>

        <!-- Images Gallery -->
        <div id="images-container">
          ${count === 0 ? '<div class="no-results"><p>No images generated yet. Use the form above to create your first AI image!</p></div>' : '<div class="loading-container"><div class="loading"></div></div>'}
        </div>

        <!-- Pagination -->
        <div id="pagination" class="pagination"></div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox(event)">
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <img id="lightbox-img" src="" alt="Full size image">
        <div id="lightbox-info" class="lightbox-info"></div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .section-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .section-header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.25rem;
      }

      .toggle-icon {
        font-size: 1.5rem;
        color: var(--text-secondary);
        transition: transform 0.3s;
      }

      .toggle-icon.rotated {
        transform: rotate(-180deg);
      }

      .generate-section {
        max-height: 1000px;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out;
      }

      .generate-section.collapsed {
        max-height: 0;
      }

      .section-header-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .section-header-toolbar h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.25rem;
      }

      .toolbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .toolbar-actions select {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--background);
        font-size: 0.875rem;
        cursor: pointer;
        color: var(--text-primary);
      }

      .generate-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }

      @media (max-width: 900px) {
        .generate-layout {
          grid-template-columns: 1fr;
        }
      }

      .content-form {
        background: var(--background);
        border-radius: 8px;
        padding: 1.5rem;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--surface);
        color: var(--text-primary);
        transition: all 0.2s;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }

      .form-hint {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .aspect-ratio-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .aspect-option {
        cursor: pointer;
      }

      .aspect-option input {
        display: none;
      }

      .aspect-box {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all 0.2s;
      }

      .aspect-box.square { width: 60px; height: 60px; }
      .aspect-box.wide { width: 80px; height: 45px; }
      .aspect-box.tall { width: 45px; height: 80px; }
      .aspect-box.standard { width: 72px; height: 54px; }
      .aspect-box.portrait { width: 54px; height: 72px; }

      .aspect-option input:checked + .aspect-box {
        border-color: var(--primary);
        background: var(--primary-light);
        color: var(--primary);
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 1rem 1.5rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary:hover {
        background: var(--primary-dark);
      }

      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-primary .hidden {
        display: none;
      }

      .preview-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .preview-container {
        background: var(--background);
        border-radius: 8px;
        padding: 1rem;
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .preview-placeholder {
        text-align: center;
        color: var(--text-secondary);
      }

      .preview-icon {
        font-size: 4rem;
        opacity: 0.3;
      }

      .preview-container img {
        max-width: 100%;
        max-height: 400px;
        border-radius: 8px;
      }

      .image-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .image-actions.hidden {
        display: none;
      }

      .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--background);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
      }

      .btn-secondary:hover {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .image-card {
        background: var(--background);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--border);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .image-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .image-wrapper {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        cursor: pointer;
        background: var(--surface);
      }

      .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
      }

      .image-card:hover .image-wrapper img {
        transform: scale(1.05);
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s;
        display: flex;
        align-items: flex-end;
        padding: 1rem;
      }

      .image-card:hover .image-overlay {
        opacity: 1;
      }

      .overlay-actions {
        display: flex;
        gap: 0.5rem;
      }

      .overlay-btn {
        background: white;
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .overlay-btn:hover {
        background: var(--primary-light);
      }

      .image-info {
        padding: 1rem;
      }

      .image-prompt {
        font-size: 0.875rem;
        color: var(--text-primary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.75rem;
      }

      .image-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .image-meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .model-badge {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.2rem 0.5rem;
        border-radius: 99px;
      }

      .size-badge {
        background: var(--surface);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
      }

      /* Lightbox */
      .lightbox {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        padding: 2rem;
      }

      .lightbox.active {
        display: flex;
      }

      .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
      }

      .lightbox-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0.5rem;
      }

      .lightbox-close:hover {
        color: var(--primary);
      }

      #lightbox-img {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 8px;
      }

      .lightbox-info {
        color: white;
        padding: 1rem 0;
        text-align: center;
        font-size: 0.875rem;
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

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      const USER_ID = '${userId}';
      let generatedImageUrl = '';
      let currentPage = 1;
      let currentSort = 'newest';
      const perPage = 12;
      let allImages = [];

      // Toggle generate section
      function toggleGenerateSection() {
        const section = document.getElementById('generate-section');
        const icon = document.getElementById('toggle-icon');
        section.classList.toggle('collapsed');
        icon.classList.toggle('rotated');
      }

      // Load enabled models
      async function loadModels() {
        const select = document.getElementById('model');
        try {
          const response = await fetch(API_BASE + '/api/enabled-models');
          const data = await response.json();

          if (data.success && data.models && data.models.imageGen && data.models.imageGen.length > 0) {
            select.innerHTML = data.models.imageGen.map(modelId =>
              '<option value="' + modelId + '">' + modelId + '</option>'
            ).join('');
          } else {
            select.innerHTML = '<option value="">No models enabled</option>';
            select.insertAdjacentHTML('afterend',
              '<div style="font-size: 11px; color: #e74c3c; margin-top: 5px;">' +
              '⚠️ No image generation models enabled. ' +
              '<a href="/dashboard/settings" style="color: var(--primary);">Configure in Settings</a>' +
              '</div>'
            );
          }
        } catch (error) {
          console.error('Failed to load models:', error);
          select.innerHTML = '<option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image (fallback)</option>';
        }
      }

      // Load all images for gallery
      async function loadImages() {
        const container = document.getElementById('images-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/proxy/ai-images?limit=100');
          const data = await response.json();

          if (data.success && data.data) {
            allImages = data.data;

            // Sort
            if (currentSort === 'oldest') {
              allImages.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
            } else {
              allImages.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
            }

            renderImages();
          } else {
            container.innerHTML = '<div class="no-results"><p>No images found</p></div>';
          }
        } catch (error) {
          console.error('Failed to load images:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load images</p></div>';
        }
      }

      function renderImages() {
        const container = document.getElementById('images-container');
        const offset = (currentPage - 1) * perPage;
        const paginated = allImages.slice(offset, offset + perPage);

        if (paginated.length === 0) {
          container.innerHTML = '<div class="no-results"><p>No images found</p></div>';
          document.getElementById('pagination').innerHTML = '';
          return;
        }

        const html = paginated.map((img) => {
          const date = new Date(img.uploaded);
          const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const prompt = img.metadata?.prompt || 'No prompt';
          const model = img.metadata?.model || 'Unknown';
          const modelShort = model.split('/').pop() || model;
          const sizeKB = (img.size / 1024).toFixed(0);

          return \`
            <div class="image-card">
              <div class="image-wrapper" onclick="openLightbox('\${img.url}', '\${escapeAttr(prompt)}', '\${model}', '\${dateStr}')">
                <img src="\${img.url}" alt="\${escapeAttr(prompt)}" loading="lazy">
                <div class="image-overlay">
                  <div class="overlay-actions">
                    <button class="overlay-btn" onclick="event.stopPropagation(); downloadImage('\${img.url}', '\${img.filename}')">⬇️ Download</button>
                    <button class="overlay-btn" onclick="event.stopPropagation(); copyUrl('\${img.url}')">🔗 Copy URL</button>
                  </div>
                </div>
              </div>
              <div class="image-info">
                <div class="image-prompt">\${escapeHtml(prompt)}</div>
                <div class="image-meta">
                  <span class="model-badge">\${modelShort}</span>
                  <span class="image-meta-item">📅 \${dateStr}</span>
                  <span class="size-badge">\${sizeKB} KB</span>
                </div>
              </div>
            </div>
          \`;
        }).join('');

        container.innerHTML = '<div class="images-grid">' + html + '</div>';
        updatePagination(allImages.length);
      }

      function openLightbox(url, prompt, model, date) {
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        const info = document.getElementById('lightbox-info');

        img.src = url;
        info.innerHTML = \`
          <p><strong>Prompt:</strong> \${prompt}</p>
          <p><strong>Model:</strong> \${model} | <strong>Generated:</strong> \${date}</p>
        \`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox(event) {
        if (event && event.target !== event.currentTarget) return;
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }

      async function downloadImage(url, filename) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename || 'ai-image.png';
          link.click();
          URL.revokeObjectURL(link.href);
        } catch (error) {
          console.error('Download failed:', error);
          showNotification('Failed to download image', 'error');
        }
      }

      function copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
          showNotification('URL copied to clipboard!', 'success');
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      }

      function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#e74c3c' : 'var(--primary)';
        notification.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: ' + bgColor + '; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 1001; animation: slideIn 0.3s ease;';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }

      function updatePagination(total) {
        const totalPages = Math.ceil(total / perPage);
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
          pagination.innerHTML = '';
          return;
        }

        let html = '';
        html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">← Prev</button>';

        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
          } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span style="padding: 0.5rem;">...</span>';
          }
        }

        html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Next →</button>';
        pagination.innerHTML = html;
      }

      function goToPage(page) {
        currentPage = page;
        renderImages();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }

      // Form submission
      document.getElementById('generate-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        const previewContainer = document.getElementById('preview-container');
        previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">⏳</span><p>Generating...</p></div>';
        document.getElementById('image-actions').classList.add('hidden');

        try {
          const aspectRatio = form.querySelector('input[name="aspectRatio"]:checked').value;

          const response = await fetch(API_BASE + '/api/proxy/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: form.prompt.value,
              model: form.model.value,
              style: form.style.value,
              aspectRatio: aspectRatio
            })
          });

          const result = await response.json();

          if (result.success && result.url) {
            generatedImageUrl = result.url;
            previewContainer.innerHTML = '<img src="' + result.url + '" alt="Generated image" />';

            document.getElementById('image-actions').classList.remove('hidden');
            document.getElementById('download-btn').href = result.url;

            showNotification('Image generated successfully!', 'success');

            // Reload gallery
            loadImages();
          } else {
            previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">❌</span><p>Generation failed</p></div>';
            showNotification('Error: ' + (result.error || 'Failed to generate image'), 'error');
          }
        } catch (error) {
          previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">❌</span><p>Generation failed</p></div>';
          showNotification('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
          btnText.classList.remove('hidden');
          btnLoading.classList.add('hidden');
        }
      });

      // Copy URL button
      document.getElementById('copy-url-btn').addEventListener('click', () => {
        if (generatedImageUrl) {
          copyUrl(generatedImageUrl);
        }
      });

      // Sort change
      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        currentPage = 1;
        if (currentSort === 'oldest') {
          allImages.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
        } else {
          allImages.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
        }
        renderImages();
      });

      // Refresh button
      document.getElementById('refresh-btn').addEventListener('click', function() {
        loadImages();
      });

      // Close lightbox on Escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLightbox();
      });

      // Initial load
      loadModels();
      if (${count} > 0) {
        loadImages();
      }
    </script>
  `;

  return baseLayout({
    title: 'AI Images - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
