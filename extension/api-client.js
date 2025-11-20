/**
 * API Client for Universal Text Processor Backend
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
    this.baseUrl = settings?.backend?.baseUrl || 'https://text-processor-api.kureckamichal.workers.dev';
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
}

// Create global instance
const apiClient = new APIClient();
