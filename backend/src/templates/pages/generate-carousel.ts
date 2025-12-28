/**
 * Generate Instagram Carousel page - create multi-slide carousels
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';

export interface GenerateCarouselPageProps {
  apiBase: string;
}

export function generateCarouselPage({ apiBase }: GenerateCarouselPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/generate-carousel', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Generate Carousel',
        subtitle: 'Create Instagram carousel slides with custom templates',
        icon: '📱',
        backLink: '/dashboard'
      })}

      <div class="carousel-layout">
        <!-- Form -->
        <div class="form-section">
          <!-- AI Generation Section -->
          <div class="ai-generation-section">
            <h3>✨ Generate with AI</h3>
            <div class="ai-form">
              <div class="form-group">
                <label for="topic">Topic / Idea</label>
                <input type="text" id="topic" placeholder="e.g., 5 tips for better sleep, Benefits of meditation..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="slideCountAi">Number of Slides</label>
                  <select id="slideCountAi">
                    <option value="3">3 slides</option>
                    <option value="5" selected>5 slides</option>
                    <option value="7">7 slides</option>
                    <option value="10">10 slides</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="contentStyle">Content Style</label>
                  <select id="contentStyle">
                    <option value="educational">Educational</option>
                    <option value="tips">Tips & Advice</option>
                    <option value="motivational">Motivational</option>
                    <option value="facts">Fun Facts</option>
                    <option value="storytelling">Storytelling</option>
                  </select>
                </div>
              </div>
              <button type="button" id="generate-content-btn" class="btn-ai" onclick="generateContent()">
                <span class="btn-text">✨ Generate Content</span>
                <span class="btn-loading hidden">⏳ Generating...</span>
              </button>
            </div>
          </div>

          <div class="section-divider">
            <span>or edit slides manually</span>
          </div>

          <form id="carousel-form" class="content-form">
            <!-- Slides Content -->
            <div class="form-group">
              <label>Slides Content</label>
              <div id="slides-container">
                <div class="slide-input" data-slide="1">
                  <div class="slide-header">
                    <span class="slide-number">Slide 1</span>
                    <button type="button" class="btn-remove-slide" onclick="removeSlide(1)" style="display:none;">✕</button>
                  </div>
                  <textarea name="slide_1" rows="3" placeholder="Enter text for slide 1..." required></textarea>
                </div>
              </div>
              <button type="button" id="add-slide-btn" class="btn-secondary" onclick="addSlide()">+ Add Slide</button>
              <span class="form-hint">Each slide will be rendered as a 1080x1080 image</span>
            </div>

            <!-- Template Style -->
            <div class="form-group">
              <label>Template Style</label>
              <div class="template-grid">
                <label class="template-option">
                  <input type="radio" name="template" value="minimal" checked />
                  <div class="template-preview minimal">
                    <span class="template-name">Minimal</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="bold" />
                  <div class="template-preview bold">
                    <span class="template-name">Bold</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="gradient" />
                  <div class="template-preview gradient">
                    <span class="template-name">Gradient</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="dark" />
                  <div class="template-preview dark">
                    <span class="template-name">Dark</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Colors -->
            <div class="form-row">
              <div class="form-group">
                <label for="primaryColor">Primary Color</label>
                <input type="color" id="primaryColor" name="primaryColor" value="#6366f1" />
              </div>
              <div class="form-group">
                <label for="bgColor">Background Color</label>
                <input type="color" id="bgColor" name="bgColor" value="#ffffff" />
              </div>
              <div class="form-group">
                <label for="textColor">Text Color</label>
                <input type="color" id="textColor" name="textColor" value="#1f2937" />
              </div>
            </div>

            <!-- Font Size -->
            <div class="form-group">
              <label for="fontSize">Font Size</label>
              <select id="fontSize" name="fontSize">
                <option value="small">Small (32px)</option>
                <option value="medium" selected>Medium (48px)</option>
                <option value="large">Large (64px)</option>
                <option value="xlarge">Extra Large (80px)</option>
              </select>
            </div>

            <!-- Include Slide Numbers -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="showSlideNumbers" name="showSlideNumbers" checked />
                <span>Show slide numbers (1/5, 2/5, etc.)</span>
              </label>
            </div>

            <button type="submit" class="btn-primary btn-generate">
              <span class="btn-text">📱 Generate Carousel</span>
              <span class="btn-loading hidden">⏳ Generating slides...</span>
            </button>
          </form>
        </div>

        <!-- Preview -->
        <div class="preview-section">
          <h3>Preview</h3>
          <div id="preview-container" class="carousel-preview">
            <div class="preview-placeholder">
              <span class="preview-icon">📱</span>
              <p>Generated slides will appear here</p>
            </div>
          </div>

          <!-- Actions (hidden until generated) -->
          <div id="carousel-actions" class="carousel-actions hidden">
            <button id="download-all-btn" class="btn-secondary" onclick="downloadAll()">⬇️ Download All</button>
            <button id="copy-urls-btn" class="btn-secondary" onclick="copyUrls()">🔗 Copy URLs</button>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div id="status-message" class="status-message hidden"></div>

      <!-- Recent carousels -->
      <div class="recent-section">
        <h3>Recent Carousels</h3>
        <div id="recent-carousels" class="recent-carousels-grid">
          <div class="loading-container"><div class="loading"></div></div>
        </div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .carousel-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
      }

      @media (max-width: 1000px) {
        .carousel-layout {
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

      .form-group input[type="color"] {
        width: 60px;
        height: 40px;
        padding: 4px;
        cursor: pointer;
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
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }

      /* Slides Container */
      #slides-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .slide-input {
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
      }

      .slide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .slide-number {
        font-weight: 600;
        color: var(--primary);
      }

      .btn-remove-slide {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
      }

      .btn-remove-slide:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      .slide-input textarea {
        margin-top: 0;
      }

      /* Template Grid */
      .template-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }

      .template-option {
        cursor: pointer;
      }

      .template-option input {
        display: none;
      }

      .template-preview {
        aspect-ratio: 1;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--border);
        transition: all 0.2s;
      }

      .template-preview.minimal {
        background: #ffffff;
        color: #1f2937;
      }

      .template-preview.bold {
        background: #6366f1;
        color: #ffffff;
      }

      .template-preview.gradient {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #ffffff;
      }

      .template-preview.dark {
        background: #1f2937;
        color: #ffffff;
      }

      .template-name {
        font-size: 0.75rem;
        font-weight: 600;
      }

      .template-option input:checked + .template-preview {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-light);
      }

      /* Checkbox */
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: normal !important;
      }

      .checkbox-label input[type="checkbox"] {
        width: auto;
        margin: 0;
      }

      /* Buttons */
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

      /* Preview Section */
      .preview-section h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
      }

      .carousel-preview {
        background: var(--surface);
        border-radius: 12px;
        padding: 1rem;
        min-height: 400px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .preview-placeholder {
        height: 100%;
        min-height: 350px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
      }

      .preview-icon {
        font-size: 4rem;
        opacity: 0.3;
        margin-bottom: 1rem;
      }

      .slides-preview {
        display: flex;
        gap: 1rem;
        overflow-x: auto;
        padding: 0.5rem;
      }

      .slide-preview-item {
        flex: 0 0 200px;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .slide-preview-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .slide-preview-item .slide-label {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 4px 8px;
        font-size: 0.75rem;
        text-align: center;
      }

      .carousel-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }

      .carousel-actions.hidden {
        display: none;
      }

      /* Status */
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

      /* Recent Section */
      .recent-section {
        margin-top: 3rem;
      }

      .recent-section h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
      }

      .recent-carousels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .recent-carousel {
        background: var(--surface);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .recent-carousel:hover {
        transform: scale(1.02);
      }

      .recent-carousel-preview {
        display: flex;
        gap: 2px;
        height: 100px;
      }

      .recent-carousel-preview img {
        flex: 1;
        object-fit: cover;
        min-width: 0;
      }

      .recent-carousel-info {
        padding: 0.75rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 2rem;
        grid-column: 1 / -1;
      }

      .no-carousels {
        grid-column: 1 / -1;
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
      }

      /* AI Generation Section */
      .ai-generation-section {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .ai-generation-section h3 {
        margin: 0 0 1rem 0;
        color: #0369a1;
        font-size: 1.1rem;
      }

      .ai-form .form-group {
        margin-bottom: 1rem;
      }

      .ai-form .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .btn-ai {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-ai:hover {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        transform: translateY(-1px);
      }

      .btn-ai:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      .btn-ai .hidden {
        display: none;
      }

      .section-divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5rem 0;
        color: var(--text-secondary);
        font-size: 0.85rem;
      }

      .section-divider::before,
      .section-divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border);
      }

      .section-divider span {
        padding: 0 1rem;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let slideCount = 1;
      let generatedSlides = [];

      // Add slide
      function addSlide() {
        slideCount++;
        const container = document.getElementById('slides-container');
        const slideHtml =
          '<div class="slide-input" data-slide="' + slideCount + '">' +
            '<div class="slide-header">' +
              '<span class="slide-number">Slide ' + slideCount + '</span>' +
              '<button type="button" class="btn-remove-slide" onclick="removeSlide(' + slideCount + ')">✕</button>' +
            '</div>' +
            '<textarea name="slide_' + slideCount + '" rows="3" placeholder="Enter text for slide ' + slideCount + '..."></textarea>' +
          '</div>';
        container.insertAdjacentHTML('beforeend', slideHtml);
        updateRemoveButtons();
      }

      // Remove slide
      function removeSlide(num) {
        const slide = document.querySelector('.slide-input[data-slide="' + num + '"]');
        if (slide) {
          slide.remove();
          renumberSlides();
        }
      }

      // Renumber slides after removal
      function renumberSlides() {
        const slides = document.querySelectorAll('.slide-input');
        slides.forEach((slide, idx) => {
          const num = idx + 1;
          slide.dataset.slide = num;
          slide.querySelector('.slide-number').textContent = 'Slide ' + num;
          slide.querySelector('textarea').name = 'slide_' + num;
          const removeBtn = slide.querySelector('.btn-remove-slide');
          if (removeBtn) {
            removeBtn.setAttribute('onclick', 'removeSlide(' + num + ')');
          }
        });
        slideCount = slides.length;
        updateRemoveButtons();
      }

      // Update remove buttons visibility
      function updateRemoveButtons() {
        const slides = document.querySelectorAll('.slide-input');
        slides.forEach(slide => {
          const removeBtn = slide.querySelector('.btn-remove-slide');
          if (removeBtn) {
            removeBtn.style.display = slides.length > 1 ? 'block' : 'none';
          }
        });
      }

      // Escape HTML special characters to prevent XSS and broken HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Generate carousel HTML template
      function generateSlideHtml(text, slideNum, totalSlides, options) {
        const { template, primaryColor, bgColor, textColor, fontSize, showSlideNumbers } = options;
        const safeText = escapeHtml(text);

        const fontSizes = {
          small: '32px',
          medium: '48px',
          large: '64px',
          xlarge: '80px'
        };
        const actualFontSize = fontSizes[fontSize] || '48px';

        let bgStyle = '';
        let textStyle = 'color: ' + textColor + ';';

        if (template === 'minimal') {
          bgStyle = 'background: ' + bgColor + ';';
        } else if (template === 'bold') {
          bgStyle = 'background: ' + primaryColor + ';';
          textStyle = 'color: #ffffff;';
        } else if (template === 'gradient') {
          bgStyle = 'background: linear-gradient(135deg, ' + primaryColor + ' 0%, #764ba2 100%);';
          textStyle = 'color: #ffffff;';
        } else if (template === 'dark') {
          bgStyle = 'background: #1f2937;';
          textStyle = 'color: #ffffff;';
        }

        const slideNumber = showSlideNumbers
          ? '<div class="slide-number">' + slideNum + '/' + totalSlides + '</div>'
          : '';

        return '<!DOCTYPE html>' +
          '<html>' +
          '<head>' +
            '<style>' +
              '* { margin: 0; padding: 0; box-sizing: border-box; }' +
              'body { width: 1080px; height: 1080px; ' + bgStyle + ' font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
              '.container { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 80px; text-align: center; }' +
              '.text { font-size: ' + actualFontSize + '; line-height: 1.4; font-weight: 600; ' + textStyle + ' max-width: 100%; word-wrap: break-word; }' +
              '.slide-number { position: absolute; bottom: 40px; right: 40px; font-size: 24px; opacity: 0.6; ' + textStyle + ' }' +
              '.accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: ' + primaryColor + '; }' +
            '</style>' +
          '</head>' +
          '<body>' +
            '<div class="accent-bar"></div>' +
            '<div class="container">' +
              '<div class="text">' + safeText + '</div>' +
            '</div>' +
            slideNumber +
          '</body>' +
          '</html>';
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

      // Generate content with AI
      async function generateContent() {
        const btn = document.getElementById('generate-content-btn');
        const topic = document.getElementById('topic').value;
        const slideCountVal = document.getElementById('slideCountAi').value;
        const style = document.getElementById('contentStyle').value;

        if (!topic.trim()) {
          showStatus('Please enter a topic or idea', 'error');
          setTimeout(hideStatus, 3000);
          return;
        }

        // Show loading state
        btn.disabled = true;
        btn.querySelector('.btn-text').classList.add('hidden');
        btn.querySelector('.btn-loading').classList.remove('hidden');
        showStatus('Generating carousel content with AI...', 'loading');

        try {
          const response = await fetch(API_BASE + '/api/proxy/generate-carousel-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: topic,
              slideCount: parseInt(slideCountVal),
              style: style
            })
          });

          const result = await response.json();

          if (result.success && result.slides && result.slides.length > 0) {
            populateSlidesFromAI(result.slides);
            showStatus('Generated ' + result.slides.length + ' slides! Review and edit as needed, then click Generate Carousel.', 'success');
          } else {
            showStatus('Error: ' + (result.error || 'Failed to generate content'), 'error');
          }
        } catch (error) {
          console.error('AI generation error:', error);
          showStatus('Error: ' + error.message, 'error');
        } finally {
          btn.disabled = false;
          btn.querySelector('.btn-text').classList.remove('hidden');
          btn.querySelector('.btn-loading').classList.add('hidden');
        }
      }

      // Populate slides from AI-generated content
      function populateSlidesFromAI(slides) {
        const container = document.getElementById('slides-container');
        container.innerHTML = '';
        slideCount = 0;

        slides.forEach((slide, idx) => {
          slideCount++;
          const num = idx + 1;
          const slideHtml =
            '<div class="slide-input" data-slide="' + num + '">' +
              '<div class="slide-header">' +
                '<span class="slide-number">Slide ' + num + '</span>' +
                '<button type="button" class="btn-remove-slide" onclick="removeSlide(' + num + ')" style="' + (slides.length > 1 ? '' : 'display:none;') + '">✕</button>' +
              '</div>' +
              '<textarea name="slide_' + num + '" rows="3" placeholder="Enter text for slide ' + num + '...">' + (slide.text || '') + '</textarea>' +
            '</div>';
          container.insertAdjacentHTML('beforeend', slideHtml);
        });

        updateRemoveButtons();

        // Scroll to the slides section
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Download all slides
      function downloadAll() {
        generatedSlides.forEach((slide, idx) => {
          const link = document.createElement('a');
          link.href = slide.url;
          link.download = 'slide-' + (idx + 1) + '.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      // Copy URLs
      function copyUrls() {
        const urls = generatedSlides.map(s => s.url).join('\\n');
        navigator.clipboard.writeText(urls).then(() => {
          showStatus('URLs copied to clipboard!', 'success');
          setTimeout(hideStatus, 3000);
        });
      }

      // Load recent carousels
      async function loadRecentCarousels() {
        const container = document.getElementById('recent-carousels');
        try {
          const response = await fetch(API_BASE + '/api/proxy/carousels?limit=6');
          const data = await response.json();

          if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(carousel => {
              const slides = carousel.slides || [];
              const previewImages = slides.slice(0, 3).map(s =>
                '<img src="' + s.url + '" alt="Slide" loading="lazy" />'
              ).join('');

              return '<div class="recent-carousel" onclick="viewCarousel(\\'' + carousel.id + '\\')">' +
                '<div class="recent-carousel-preview">' + previewImages + '</div>' +
                '<div class="recent-carousel-info">' + slides.length + ' slides • ' + new Date(carousel.createdAt).toLocaleDateString() + '</div>' +
              '</div>';
            }).join('');
          } else {
            container.innerHTML = '<div class="no-carousels">No carousels created yet</div>';
          }
        } catch (error) {
          console.error('Failed to load carousels:', error);
          container.innerHTML = '<div class="no-carousels">Failed to load carousels</div>';
        }
      }

      function viewCarousel(id) {
        // TODO: Open carousel detail view
        console.log('View carousel:', id);
      }

      // Form submission
      document.getElementById('carousel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');

        const previewContainer = document.getElementById('preview-container');
        previewContainer.innerHTML = '<div class="preview-placeholder"><span class="preview-icon">⏳</span><p>Generating slides...</p></div>';
        document.getElementById('carousel-actions').classList.add('hidden');
        generatedSlides = [];

        // Collect slides
        const slideInputs = document.querySelectorAll('.slide-input textarea');
        const slides = [];
        slideInputs.forEach(input => {
          if (input.value.trim()) {
            slides.push(input.value.trim());
          }
        });

        if (slides.length === 0) {
          showStatus('Please add at least one slide with content', 'error');
          btn.disabled = false;
          btnText.classList.remove('hidden');
          btnLoading.classList.add('hidden');
          return;
        }

        const options = {
          template: form.querySelector('input[name="template"]:checked').value,
          primaryColor: form.primaryColor.value,
          bgColor: form.bgColor.value,
          textColor: form.textColor.value,
          fontSize: form.fontSize.value,
          showSlideNumbers: form.showSlideNumbers.checked
        };

        showStatus('Generating ' + slides.length + ' slides...', 'loading');

        try {
          const generatedUrls = [];

          // Generate each slide with small delay between requests
          for (let i = 0; i < slides.length; i++) {
            showStatus('Generating slide ' + (i + 1) + ' of ' + slides.length + '...', 'loading');

            // Add significant delay between requests
            // The html-to-image worker can only handle one request at a time
            // and returns placeholder images if requests come too fast
            if (i > 0) {
              showStatus('Waiting for renderer to be ready (' + (i + 1) + '/' + slides.length + ')...', 'loading');
              await new Promise(resolve => setTimeout(resolve, 8000));
            }

            const html = generateSlideHtml(slides[i], i + 1, slides.length, options);
            showStatus('Generating slide ' + (i + 1) + ' of ' + slides.length + '...', 'loading');
            console.log('Generating slide ' + (i + 1) + ', HTML length:', html.length);

            let result;
            let lastError = null;

            // Retry up to 3 times with exponential backoff
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                if (attempt > 0) {
                  const retryDelay = 5000 * Math.pow(2, attempt - 1);
                  console.log('Retry attempt ' + (attempt + 1) + ' for slide ' + (i + 1) + ' after ' + retryDelay + 'ms');
                  showStatus('Retrying slide ' + (i + 1) + ' (attempt ' + (attempt + 1) + '/3)...', 'loading');
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

                const response = await fetch(API_BASE + '/api/proxy/carousel-slide', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    html: html,
                    width: 1080,
                    height: 1080,
                    format: 'png',
                    slideIndex: i + 1,
                    totalSlides: slides.length
                  })
                });

                result = await response.json();
                console.log('Slide ' + (i + 1) + ' result (attempt ' + (attempt + 1) + '):', result);

                if (result.success && result.url) {
                  break; // Success, exit retry loop
                }

                // Check if it's a retryable error (placeholder image)
                lastError = result.error || result.details || 'No URL returned';
                if (result.retryable) {
                  console.log('Retryable error for slide ' + (i + 1) + ':', lastError);
                  continue; // Try again
                }
              } catch (fetchErr) {
                lastError = fetchErr.message;
                console.error('Slide ' + (i + 1) + ' fetch error:', fetchErr);
              }
            }

            if (result && result.success && result.url) {
              generatedUrls.push({ url: result.url, text: slides[i] });
            } else {
              console.error('Slide ' + (i + 1) + ' failed after retries:', result || lastError);
              throw new Error(lastError || 'Failed to generate slide ' + (i + 1));
            }
          }

          generatedSlides = generatedUrls;

          // Show preview
          previewContainer.innerHTML = '<div class="slides-preview">' +
            generatedUrls.map((slide, idx) =>
              '<div class="slide-preview-item">' +
                '<img src="' + slide.url + '" alt="Slide ' + (idx + 1) + '" />' +
                '<div class="slide-label">Slide ' + (idx + 1) + '</div>' +
              '</div>'
            ).join('') +
          '</div>';

          document.getElementById('carousel-actions').classList.remove('hidden');
          showStatus('Saving carousel to history...', 'loading');

          // Save carousel to database
          try {
            const topic = document.getElementById('topic').value;
            const saveResponse = await fetch(API_BASE + '/api/proxy/carousels', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: topic || 'Carousel ' + new Date().toLocaleDateString(),
                slides: generatedUrls,
                template: options.template,
                primaryColor: options.primaryColor
              })
            });
            const saveResult = await saveResponse.json();
            if (saveResult.success) {
              showStatus('Carousel generated and saved! ' + generatedUrls.length + ' slides created.', 'success');
            } else {
              showStatus('Carousel generated but failed to save: ' + (saveResult.error || 'Unknown error'), 'error');
            }
          } catch (saveError) {
            console.error('Failed to save carousel:', saveError);
            showStatus('Carousel generated but failed to save to history', 'error');
          }

          loadRecentCarousels();

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
      loadRecentCarousels();
    </script>
  `;

  return baseLayout({
    title: 'Generate Carousel - My Memory 🧠',
    content,
    styles,
    scripts
  });
}
