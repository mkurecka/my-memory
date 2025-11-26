/**
 * Generate Image page - form for AI image generation directly from dashboard
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';

export interface GenerateImagePageProps {
  apiBase: string;
  userId: string;
}

export function generateImagePage({ apiBase, userId }: GenerateImagePageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/generate-image', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Generate Image',
        subtitle: 'Create AI-generated images with various models',
        icon: '🎨',
        backLink: '/dashboard'
      })}

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
            <a id="view-gallery-btn" href="/dashboard/ai-images" class="btn-secondary">🖼️ View Gallery</a>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div id="status-message" class="status-message hidden"></div>

      <!-- Recent generations -->
      <div class="recent-section">
        <h3>Recent Generations</h3>
        <div id="recent-images" class="recent-images-grid">
          <div class="loading-container"><div class="loading"></div></div>
        </div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .generate-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      }

      @media (max-width: 900px) {
        .generate-layout {
          grid-template-columns: 1fr;
        }
      }

      .content-form {
        background: var(--surface);
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        background: var(--background);
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
        background: var(--background);
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
        background: var(--surface);
        border-radius: 12px;
        padding: 1rem;
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        max-height: 500px;
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
        background: var(--surface);
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

      .status-message {
        margin-top: 1.5rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
      }

      .status-message.hidden {
        display: none;
      }

      .status-message.success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #6ee7b7;
      }

      .status-message.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      .status-message.loading {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #7dd3fc;
      }

      .recent-section {
        margin-top: 3rem;
      }

      .recent-section h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
      }

      .recent-images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
      }

      .recent-image {
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .recent-image:hover {
        transform: scale(1.05);
      }

      .recent-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 2rem;
        grid-column: 1 / -1;
      }

      .no-images {
        grid-column: 1 / -1;
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      const USER_ID = '${userId}';
      let generatedImageUrl = '';

      // Load available models
      async function loadModels() {
        const select = document.getElementById('model');
        try {
          const response = await fetch(API_BASE + '/api/proxy/image-models?refresh=false');
          const data = await response.json();

          if (data.success && data.data) {
            select.innerHTML = data.data.map(model =>
              '<option value="' + model.id + '">' + model.name + '</option>'
            ).join('');
          } else {
            select.innerHTML = '<option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>';
          }
        } catch (error) {
          console.error('Failed to load models:', error);
          select.innerHTML = '<option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>';
        }
      }

      // Load recent images
      async function loadRecentImages() {
        const container = document.getElementById('recent-images');
        try {
          const response = await fetch(API_BASE + '/api/proxy/ai-images?limit=8');
          const data = await response.json();

          if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(img =>
              '<div class="recent-image" onclick="showImage(\\'' + img.url + '\\')">' +
                '<img src="' + img.url + '" alt="Generated image" loading="lazy" />' +
              '</div>'
            ).join('');
          } else {
            container.innerHTML = '<div class="no-images">No images generated yet</div>';
          }
        } catch (error) {
          console.error('Failed to load recent images:', error);
          container.innerHTML = '<div class="no-images">Failed to load images</div>';
        }
      }

      function showImage(url) {
        const container = document.getElementById('preview-container');
        container.innerHTML = '<img src="' + url + '" alt="Generated image" />';
        generatedImageUrl = url;

        document.getElementById('image-actions').classList.remove('hidden');
        document.getElementById('download-btn').href = url;
      }

      // Show status message
      function showStatus(message, type) {
        const el = document.getElementById('status-message');
        el.textContent = message;
        el.className = 'status-message ' + type;
      }

      function hideStatus() {
        document.getElementById('status-message').className = 'status-message hidden';
      }

      // Copy URL
      document.getElementById('copy-url-btn').addEventListener('click', () => {
        if (generatedImageUrl) {
          navigator.clipboard.writeText(generatedImageUrl).then(() => {
            showStatus('URL copied to clipboard!', 'success');
            setTimeout(hideStatus, 3000);
          });
        }
      });

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
        showStatus('Generating image... This may take 10-30 seconds.', 'loading');

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

          if (result.success && result.imageUrl) {
            generatedImageUrl = result.imageUrl;
            previewContainer.innerHTML = '<img src="' + result.imageUrl + '" alt="Generated image" />';

            document.getElementById('image-actions').classList.remove('hidden');
            document.getElementById('download-btn').href = result.imageUrl;

            showStatus('Image generated successfully!', 'success');

            // Reload recent images
            loadRecentImages();
          } else {
            previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">❌</span><p>Generation failed</p></div>';
            showStatus('Error: ' + (result.error || 'Failed to generate image'), 'error');
          }
        } catch (error) {
          previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">❌</span><p>Generation failed</p></div>';
          showStatus('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
          btnText.classList.remove('hidden');
          btnLoading.classList.add('hidden');
        }
      });

      // Initial load
      loadModels();
      loadRecentImages();
    </script>
  `;

  return baseLayout({
    title: 'Generate Image - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
