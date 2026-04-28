/**
 * API Client for My Memory Backend
 * Handles all communication with the Cloudflare Workers backend
 */

class APIClient {
  constructor() {
    this.baseUrl = null;
    this.apiVersion = null;
    this.apiKey = null;
  }

  async init() {
    // Load settings to get backend configuration
    const settings = await this.loadSettings();
    this.baseUrl = settings?.backend?.baseUrl || 'https://my-memory.kureckamichal.workers.dev';
    this.apiVersion = settings?.backend?.apiVersion || 'v1';

    // Load API key from chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        this.apiKey = result.apiKey;
        console.log('[API Client] Initialized with base URL:', this.baseUrl);
        resolve();
      });
    });
  }

  async loadSettings() {
    try {
      const response = await fetch(chrome.runtime.getURL('settings.json'));
      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to load settings:', error);
      return null;
    }
  }

  getEndpoint(path) {
    return `${this.baseUrl}/api/${this.apiVersion}${path}`;
  }

  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async saveToMemory(data) {
    try {
      const response = await fetch(this.getEndpoint('/memory'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to save to memory:', error);
      throw error;
    }
  }

  async ingestMemory(data) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ingest`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({
          ...data,
          userId: data.userId || 'michal_main_user'
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('[API Client] Failed to ingest memory:', error);
      throw error;
    }
  }

  async processText(data) {
    try {
      const response = await fetch(this.getEndpoint('/process'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to process text:', error);
      throw error;
    }
  }

  async sendWebhook(eventType, data) {
    try {
      const settings = await this.loadSettings();
      const webhookUrl = settings?.webhook?.url;

      if (!webhookUrl || !settings?.webhook?.enabled) {
        console.log('[API Client] Webhook not configured or disabled');
        return null;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventType,
          data: data,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('[API Client] Webhook failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Webhook error:', error);
      return null;
    }
  }

  async getSettings() {
    try {
      const response = await fetch(this.getEndpoint('/settings'), {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to get settings:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const response = await fetch(this.getEndpoint('/settings'), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to update settings:', error);
      throw error;
    }
  }

  // ========== Posts API Methods ==========

  async getAllPosts(options = {}) {
    try {
      const { status, type, limit = 50, offset = 0 } = options;
      const params = new URLSearchParams();

      if (status) params.append('status', status);
      if (type) params.append('type', type);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${this.getEndpoint('/posts')}?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.posts || [];
    } catch (error) {
      console.error('[API Client] Failed to get posts:', error);
      return [];
    }
  }

  async getPostById(postId) {
    try {
      const response = await fetch(this.getEndpoint(`/posts/${postId}`), {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.post || null;
    } catch (error) {
      console.error('[API Client] Failed to get post:', error);
      return null;
    }
  }

  async updatePostStatus(postId, status, generatedOutput = null) {
    try {
      const body = { status };
      if (generatedOutput) body.generated_output = generatedOutput;

      const response = await fetch(this.getEndpoint(`/posts/${postId}`), {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to update post status:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      const response = await fetch(this.getEndpoint(`/posts/${postId}`), {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to delete post:', error);
      throw error;
    }
  }

  async getPostsStats() {
    try {
      const response = await fetch(this.getEndpoint('/posts/stats/summary'), {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.stats || {
        total: 0,
        pending: 0,
        approved: 0,
        done: 0,
        rejected: 0
      };
    } catch (error) {
      console.error('[API Client] Failed to get posts stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        done: 0,
        rejected: 0
      };
    }
  }
}

// Create global instance
const apiClient = new APIClient();
