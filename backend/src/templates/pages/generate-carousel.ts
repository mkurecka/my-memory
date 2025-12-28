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
          <details class="collapsible-section" open>
            <summary class="section-header">
              <span class="section-icon">✨</span>
              <span class="section-title">Generate with AI</span>
              <span class="section-badge">Recommended</span>
            </summary>
            <div class="section-content">
              <p class="section-description">Let AI create carousel content for you. Just provide a topic and style preferences.</p>
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
              <div class="form-group">
                <label for="languageAi">Language</label>
                <select id="languageAi" name="languageAi">
                  <option value="en">English</option>
                  <option value="cs" selected>Czech (Čeština)</option>
                  <option value="sk">Slovak (Slovenčina)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enableCtaAi" name="enableCtaAi" onchange="toggleCTAOptionsAi()" />
                  <span>Add CTA (Call-to-Action) slide</span>
                </label>
              </div>
              <div class="form-group" id="cta-type-group-ai" style="display: none;">
                <label for="ctaTypeAi">CTA Type</label>
                <select id="ctaTypeAi" name="ctaTypeAi" onchange="toggleCustomCTAMessageAi()">
                  <option value="comment">Comment to get more</option>
                  <option value="save">Save for later</option>
                  <option value="follow" selected>Follow for more tips</option>
                  <option value="share">Share with friends</option>
                  <option value="visit">Visit our website</option>
                  <option value="subscribe">Subscribe for updates</option>
                  <option value="custom">Custom message</option>
                </select>
              </div>
              <div class="form-group" id="cta-custom-group-ai" style="display: none;">
                <label for="ctaCustomMessageAi">Custom CTA Message</label>
                <input type="text" id="ctaCustomMessageAi" name="ctaCustomMessageAi" placeholder="Enter your custom message..." />
              </div>
              <button type="button" id="generate-content-btn" class="btn-ai" onclick="generateContent()">
                <span class="btn-text">✨ Generate Content</span>
                <span class="btn-loading hidden">⏳ Generating...</span>
              </button>
            </div>
            </div>
          </details>

          <!-- Manual Creation Section -->
          <details class="collapsible-section">
            <summary class="section-header">
              <span class="section-icon">📝</span>
              <span class="section-title">Manual Creation</span>
              <span class="section-badge">Advanced</span>
            </summary>
            <div class="section-content">
              <p class="section-description">Create carousel manually with full control over slides, templates, and styling.</p>

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
                <label class="template-option">
                  <input type="radio" name="template" value="modern" />
                  <div class="template-preview modern">
                    <span class="template-name">Modern</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="playful" />
                  <div class="template-preview playful">
                    <span class="template-name">Playful</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="professional" />
                  <div class="template-preview professional">
                    <span class="template-name">Pro</span>
                  </div>
                </label>
                <label class="template-option">
                  <input type="radio" name="template" value="vibrant" />
                  <div class="template-preview vibrant">
                    <span class="template-name">Vibrant</span>
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

            <!-- Language -->
            <div class="form-group">
              <label for="language">Language</label>
              <select id="language" name="language">
                <option value="en">English</option>
                <option value="cs" selected>Czech (Čeština)</option>
                <option value="sk">Slovak (Slovenčina)</option>
                <option value="de">German (Deutsch)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
              </select>
            </div>

            <!-- Include Slide Numbers -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="showSlideNumbers" name="showSlideNumbers" checked />
                <span>Show slide numbers (1/5, 2/5, etc.)</span>
              </label>
            </div>

            <!-- CTA Slide -->
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="enableCTA" name="enableCTA" onchange="toggleCTAOptions()" />
                <span>Add CTA (Call-to-Action) slide at the end</span>
              </label>
            </div>

            <!-- CTA Type (shown when CTA is enabled) -->
            <div class="form-group" id="cta-type-group" style="display: none;">
              <label for="ctaType">CTA Type</label>
              <select id="ctaType" name="ctaType">
                <option value="comment">Comment to get more</option>
                <option value="save">Save for later</option>
                <option value="follow">Follow for more tips</option>
                <option value="share">Share with friends</option>
                <option value="visit">Visit our website</option>
                <option value="subscribe">Subscribe for updates</option>
                <option value="custom">Custom message</option>
              </select>
            </div>

            <!-- Custom CTA Message (shown when custom type is selected) -->
            <div class="form-group" id="cta-custom-group" style="display: none;">
              <label for="ctaCustomMessage">Custom CTA Message</label>
              <input type="text" id="ctaCustomMessage" name="ctaCustomMessage" placeholder="Enter your custom message..." />
            </div>

            <button type="submit" class="btn-primary btn-generate">
              <span class="btn-text">📱 Generate Carousel</span>
              <span class="btn-loading hidden">⏳ Generating slides...</span>
            </button>
          </form>
            </div>
          </details>
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

      <!-- Carousel Viewer Modal -->
      <div id="carousel-viewer-modal" class="modal-overlay hidden" onclick="closeCarouselViewer(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Carousel Preview</h3>
            <button class="modal-close" onclick="closeCarouselViewer()">&times;</button>
          </div>
          <div id="carousel-viewer-content" class="modal-body">
            <div class="loading-container"><div class="loading"></div></div>
          </div>
          <div class="modal-footer">
            <button id="download-carousel-btn" class="btn-primary" onclick="downloadCarousel()">⬇️ Download All Slides</button>
          </div>
        </div>
      </div>

      <!-- Recent carousels -->
      <div class="recent-section">
        <div class="recent-header">
          <h3>📚 Recent Carousels</h3>
          <div class="recent-toolbar">
            <input type="text" id="carousel-search" placeholder="Search carousels..." />
            <select id="carousel-filter">
              <option value="">All Templates</option>
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
              <option value="gradient">Gradient</option>
              <option value="dark">Dark</option>
              <option value="modern">Modern</option>
              <option value="playful">Playful</option>
              <option value="professional">Professional</option>
              <option value="vibrant">Vibrant</option>
            </select>
          </div>
        </div>
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

      /* Collapsible Sections */
      .collapsible-section {
        background: var(--surface);
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
        overflow: hidden;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, var(--surface), var(--background));
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        list-style: none;
      }

      .section-header::-webkit-details-marker {
        display: none;
      }

      .section-header:hover {
        background: var(--background);
      }

      .collapsible-section[open] .section-header {
        border-bottom: 1px solid var(--border);
      }

      .section-icon {
        font-size: 1.5rem;
      }

      .section-title {
        flex: 1;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .section-badge {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        text-transform: uppercase;
      }

      .section-content {
        padding: 1.5rem;
      }

      .section-description {
        margin-bottom: 1.5rem;
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.6;
      }

      /* Recent Carousels Header */
      .recent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .recent-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .recent-toolbar {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .recent-toolbar input {
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
        min-width: 200px;
      }

      .recent-toolbar input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .recent-toolbar select {
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .content-form {
        background: transparent;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
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

      @media (max-width: 768px) {
        .template-grid {
          grid-template-columns: repeat(2, 1fr);
        }
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

      .template-preview.modern {
        background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
        color: #ffffff;
      }

      .template-preview.playful {
        background: linear-gradient(135deg, #ffa500 0%, #ff1493 100%);
        color: #ffffff;
      }

      .template-preview.professional {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
        color: #ffffff;
      }

      .template-preview.vibrant {
        background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
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

      /* Modal Overlay */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
      }

      .modal-overlay.hidden {
        display: none;
      }

      .modal-content {
        background: var(--surface);
        border-radius: 12px;
        max-width: 1200px;
        max-height: 90vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
      }

      .modal-header h3 {
        margin: 0;
        color: var(--text-primary);
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 2rem;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
      }

      .modal-close:hover {
        background: var(--hover);
      }

      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      }

      .carousel-viewer-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }

      .carousel-viewer-slide {
        border-radius: 8px;
        overflow: hidden;
        background: var(--background);
        border: 1px solid var(--border);
      }

      .carousel-viewer-slide img {
        width: 100%;
        height: auto;
        display: block;
      }

      .carousel-viewer-slide-number {
        padding: 0.5rem;
        text-align: center;
        font-size: 0.9rem;
        color: var(--text-secondary);
        background: var(--surface);
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

      // Toggle CTA options visibility
      function toggleCTAOptions() {
        const enableCTA = document.getElementById('enableCTA').checked;
        const ctaTypeGroup = document.getElementById('cta-type-group');
        ctaTypeGroup.style.display = enableCTA ? 'block' : 'none';

        // Also check if custom message should be shown
        if (enableCTA) {
          toggleCustomCTAMessage();
        } else {
          document.getElementById('cta-custom-group').style.display = 'none';
        }
      }

      // Toggle custom CTA message input
      function toggleCustomCTAMessage() {
        const ctaType = document.getElementById('ctaType').value;
        const customGroup = document.getElementById('cta-custom-group');
        customGroup.style.display = ctaType === 'custom' ? 'block' : 'none';
      }

      // Toggle CTA options visibility (AI section)
      function toggleCTAOptionsAi() {
        const enableCTA = document.getElementById('enableCtaAi').checked;
        const ctaTypeGroup = document.getElementById('cta-type-group-ai');
        ctaTypeGroup.style.display = enableCTA ? 'block' : 'none';

        // Also check if custom message should be shown
        if (enableCTA) {
          toggleCustomCTAMessageAi();
        } else {
          document.getElementById('cta-custom-group-ai').style.display = 'none';
        }
      }

      // Toggle custom CTA message input (AI section)
      function toggleCustomCTAMessageAi() {
        const ctaType = document.getElementById('ctaTypeAi').value;
        const customGroup = document.getElementById('cta-custom-group-ai');
        customGroup.style.display = ctaType === 'custom' ? 'block' : 'none';
      }

      // Get CTA message based on type and language
      function getCTAMessage(type, customMessage, language) {
        const messages = {
          en: {
            comment: '💬 Comment "YES" to get the full guide',
            save: '💾 Save this for later!',
            follow: '👉 Follow for more tips',
            share: '📤 Share with your friends',
            visit: '🌐 Visit our website for more',
            subscribe: '🔔 Subscribe for daily updates'
          },
          cs: {
            comment: '💬 Napiš "ANO" pro kompletní průvodce',
            save: '💾 Ulož si to na později!',
            follow: '👉 Sleduj pro více tipů',
            share: '📤 Sdílej s přáteli',
            visit: '🌐 Navštiv náš web pro více',
            subscribe: '🔔 Přihlas se k odběru denních novinek'
          },
          sk: {
            comment: '💬 Napíš "ÁNO" pre kompletný návod',
            save: '💾 Ulož si to na neskôr!',
            follow: '👉 Sleduj pre viac tipov',
            share: '📤 Zdieľaj s priateľmi',
            visit: '🌐 Navštív náš web pre viac',
            subscribe: '🔔 Prihlás sa k odberu denných noviniek'
          },
          de: {
            comment: '💬 Kommentiere "JA" für den vollständigen Leitfaden',
            save: '💾 Für später speichern!',
            follow: '👉 Folge für mehr Tipps',
            share: '📤 Mit Freunden teilen',
            visit: '🌐 Besuche unsere Website für mehr',
            subscribe: '🔔 Abonniere für tägliche Updates'
          },
          es: {
            comment: '💬 Comenta "SÍ" para obtener la guía completa',
            save: '💾 ¡Guarda esto para más tarde!',
            follow: '👉 Síguenos para más consejos',
            share: '📤 Comparte con tus amigos',
            visit: '🌐 Visita nuestro sitio web para más',
            subscribe: '🔔 Suscríbete para actualizaciones diarias'
          },
          fr: {
            comment: '💬 Commente "OUI" pour obtenir le guide complet',
            save: '💾 Enregistrez ceci pour plus tard!',
            follow: '👉 Suivez pour plus de conseils',
            share: '📤 Partagez avec vos amis',
            visit: '🌐 Visitez notre site web pour plus',
            subscribe: '🔔 Abonnez-vous pour les mises à jour quotidiennes'
          }
        };

        if (type === 'custom') {
          return customMessage || messages[language]?.follow || messages.en.follow;
        }

        return messages[language]?.[type] || messages.en[type] || messages.en.follow;
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
        } else if (template === 'modern') {
          bgStyle = 'background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);';
          textStyle = 'color: #ffffff;';
        } else if (template === 'playful') {
          bgStyle = 'background: linear-gradient(135deg, #ffa500 0%, #ff1493 100%);';
          textStyle = 'color: #ffffff;';
        } else if (template === 'professional') {
          bgStyle = 'background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);';
          textStyle = 'color: #ffffff;';
        } else if (template === 'vibrant') {
          bgStyle = 'background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);';
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
        const language = document.getElementById('languageAi').value;
        const ctaEnabled = document.getElementById('enableCtaAi').checked;
        const ctaType = document.getElementById('ctaTypeAi').value;
        const ctaMessage = document.getElementById('ctaCustomMessageAi').value;

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
              style: style,
              language: language,
              ctaEnabled: ctaEnabled,
              ctaType: ctaType,
              ctaMessage: ctaMessage
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
      let allCarousels = [];
      let currentSearchQuery = '';
      let currentTemplateFilter = '';

      async function loadRecentCarousels() {
        const container = document.getElementById('recent-carousels');
        try {
          const response = await fetch(API_BASE + '/api/proxy/carousels?limit=50');
          const data = await response.json();

          if (data.success && data.data && data.data.length > 0) {
            allCarousels = data.data;
            filterAndDisplayCarousels();
          } else {
            container.innerHTML = '<div class="no-carousels">No carousels created yet</div>';
          }
        } catch (error) {
          console.error('Failed to load carousels:', error);
          container.innerHTML = '<div class="no-carousels">Failed to load carousels</div>';
        }
      }

      function filterAndDisplayCarousels() {
        const container = document.getElementById('recent-carousels');

        let filtered = allCarousels;

        // Filter by template
        if (currentTemplateFilter) {
          filtered = filtered.filter(c => c.template === currentTemplateFilter);
        }

        // Filter by search query
        if (currentSearchQuery) {
          const query = currentSearchQuery.toLowerCase();
          filtered = filtered.filter(c => {
            const slides = c.slides || [];
            const slideTexts = slides.map(s => (s.text || '').toLowerCase()).join(' ');
            return slideTexts.includes(query);
          });
        }

        if (filtered.length > 0) {
          container.innerHTML = filtered.map(carousel => {
            const slides = carousel.slides || [];
            const previewImages = slides.slice(0, 3).map(s =>
              '<img src="' + s.url + '" alt="Slide" loading="lazy" />'
            ).join('');

            return '<div class="recent-carousel" onclick="viewCarousel(\\'' + carousel.id + '\\')">' +
              '<div class="recent-carousel-preview">' + previewImages + '</div>' +
              '<div class="recent-carousel-info">' +
                '<span class="template-badge">' + carousel.template + '</span> • ' +
                slides.length + ' slides • ' +
                new Date(carousel.createdAt).toLocaleDateString() +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          container.innerHTML = '<div class="no-carousels">No carousels match your filters</div>';
        }
      }

      // Search and filter event listeners
      document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('carousel-search');
        const filterSelect = document.getElementById('carousel-filter');

        if (searchInput) {
          let searchTimeout;
          searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
              currentSearchQuery = e.target.value;
              filterAndDisplayCarousels();
            }, 300);
          });
        }

        if (filterSelect) {
          filterSelect.addEventListener('change', function(e) {
            currentTemplateFilter = e.target.value;
            filterAndDisplayCarousels();
          });
        }
      });

      // Global variable to store current carousel slides
      let currentCarouselSlides = [];

      async function viewCarousel(id) {
        const modal = document.getElementById('carousel-viewer-modal');
        const content = document.getElementById('carousel-viewer-content');

        // Show modal with loading
        modal.classList.remove('hidden');
        content.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          console.log('Fetching carousel:', id);
          const response = await fetch(API_BASE + '/api/proxy/carousels/' + id);
          console.log('Response status:', response.status);

          const data = await response.json();
          console.log('Response data:', data);

          if (!response.ok) {
            content.innerHTML = '<div class="no-carousels">Error: ' + (data.error || 'Failed to load carousel') + '</div>';
            return;
          }

          if (data.success && data.data && data.data.slides) {
            const carousel = data.data;
            currentCarouselSlides = carousel.slides;

            if (carousel.slides.length === 0) {
              content.innerHTML = '<div class="no-carousels">This carousel has no slides</div>';
              return;
            }

            // Render slides in grid
            content.innerHTML = '<div class="carousel-viewer-grid">' +
              carousel.slides.map((slide, idx) =>
                '<div class="carousel-viewer-slide">' +
                  '<img src="' + slide.url + '" alt="Slide ' + (idx + 1) + '" loading="lazy" />' +
                  '<div class="carousel-viewer-slide-number">Slide ' + (idx + 1) + ' of ' + carousel.slides.length + '</div>' +
                '</div>'
              ).join('') +
            '</div>';
          } else {
            console.error('Invalid response structure:', data);
            content.innerHTML = '<div class="no-carousels">Failed to load carousel: Invalid response format</div>';
          }
        } catch (error) {
          console.error('Failed to load carousel:', error);
          content.innerHTML = '<div class="no-carousels">Error loading carousel: ' + error.message + '</div>';
        }
      }

      function closeCarouselViewer(event) {
        // Only close if clicking overlay (not modal content)
        if (!event || event.target.id === 'carousel-viewer-modal' || !event.target.closest) {
          document.getElementById('carousel-viewer-modal').classList.add('hidden');
          currentCarouselSlides = [];
        }
      }

      function downloadCarousel() {
        if (currentCarouselSlides.length === 0) return;

        currentCarouselSlides.forEach((slide, idx) => {
          // Add small delay between downloads to avoid blocking
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = slide.url;
            link.download = 'carousel-slide-' + (idx + 1) + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, idx * 200);
        });

        showStatus('Downloading ' + currentCarouselSlides.length + ' slides...', 'success');
        setTimeout(hideStatus, 3000);
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
          showSlideNumbers: form.showSlideNumbers.checked,
          language: form.language.value
        };

        // Note: CTA slide is now generated by AI if enabled during content generation
        // No need to add it manually here as it's already in the slide textareas

        const totalSlides = slides.length;
        showStatus('Generating ' + totalSlides + ' slides...', 'loading');

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

      // Add CTA type change listener
      document.getElementById('ctaType').addEventListener('change', toggleCustomCTAMessage);

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
