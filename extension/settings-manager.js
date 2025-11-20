// Settings Manager for X Post Sender Extension
// Handles loading and managing account profiles and configuration

class SettingsManager {
  constructor() {
    this.settings = null;
    this.loaded = false;
  }

  // Load settings from settings.json
  async load() {
    try {
      const response = await fetch(chrome.runtime.getURL('settings.json'));
      this.settings = await response.json();
      this.loaded = true;
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Return default fallback settings
      return this.getDefaultSettings();
    }
  }

  // Get all enabled accounts
  getAccounts() {
    if (!this.loaded || !this.settings) {
      console.warn('Settings not loaded');
      return [];
    }
    return this.settings.accounts.filter(acc => acc.enabled);
  }

  // Get specific account by ID
  getAccount(accountId) {
    if (!this.loaded || !this.settings) {
      console.warn('Settings not loaded');
      return null;
    }
    return this.settings.accounts.find(acc => acc.id === accountId);
  }

  // Get writing profile for an account
  getWritingProfile(accountId) {
    const account = this.getAccount(accountId);
    return account ? account.writingProfile : null;
  }

  // Build prompt using account profile, mode, and language
  async buildPrompt(mode, accountId, tweetText, additionalContext = '', languageCode = null, actionParams = {}) {
    if (!this.loaded || !this.settings) {
      console.warn('Settings not loaded');
      return this.getFallbackPrompt(mode, tweetText, additionalContext);
    }

    const modeConfig = this.settings.modes[mode];
    const profile = accountId ? this.getWritingProfile(accountId) : null;

    if (!modeConfig) {
      return this.getFallbackPrompt(mode, tweetText, additionalContext);
    }

    // Load custom prompts from chrome.storage
    const customPrompts = await new Promise((resolve) => {
      chrome.storage.local.get(['customPrompts'], (result) => {
        resolve(result.customPrompts || {});
      });
    });

    // Use custom prompt if available, otherwise use default from settings.json
    let prompt = customPrompts[mode] || modeConfig.promptTemplate;

    // Replace profile placeholders if profile exists
    if (profile) {
      prompt = prompt
        .replace('{tone}', profile.tone || 'neutral')
        .replace('{style}', profile.style || 'clear')
        .replace('{personality}', profile.personality || 'professional')
        .replace('{targetAudience}', profile.targetAudience || 'general audience')
        .replace('{formality}', profile.voiceCharacteristics?.formality || 'neutral')
        .replace('{humor}', profile.voiceCharacteristics?.humor || 'none')
        .replace('{enthusiasm}', profile.voiceCharacteristics?.enthusiasm || 'moderate')
        .replace('{guidelines}', profile.guidelines?.map(g => `- ${g}`).join('\n') || 'None')
        .replace('{avoid}', profile.avoid?.map(a => `- ${a}`).join('\n') || 'None');
    }

    // Add action-specific instructions
    if (mode === 'article' && actionParams.targetPlatform) {
      prompt += `\n\nTarget Platform: ${actionParams.targetPlatform}`;
      prompt += `\nArticle Style: ${actionParams.articleStyle || 'general'}`;
    }

    if (mode === 'summarize' && actionParams.summaryLength) {
      prompt += `\n\nSummary Length: ${actionParams.summaryLength}`;
      prompt += `\nFormat: ${actionParams.summaryFormat || 'paragraph'}`;
    }

    if (mode === 'translate' && actionParams.targetLanguage) {
      const targetLang = this.getLanguage(actionParams.targetLanguage);
      if (targetLang) {
        prompt += `\n\nTarget Language: ${targetLang.name}`;
        prompt += `\nTranslation Style: ${actionParams.translationStyle || 'natural'}`;
      }
    }

    if (mode === 'extract_insights' && actionParams.insightsCount) {
      prompt += `\n\nNumber of Insights: ${actionParams.insightsCount}`;
      prompt += `\nFocus: ${actionParams.insightsFocus || 'all'}`;
    }

    // Add language instruction if specified (for non-translate modes)
    if (languageCode && mode !== 'translate') {
      const language = this.getLanguage(languageCode);
      if (language) {
        prompt += `\n\nIMPORTANT: ${language.instruction}`;
      }
    } else if (profile && profile.language && mode !== 'translate') {
      // Use profile's default language if set
      prompt += `\n\nIMPORTANT: Write in ${profile.language} language`;
    }

    prompt += `\n\n"${tweetText}"`;

    if (additionalContext) {
      prompt += `\n\nAdditional context/instructions: ${additionalContext}`;
    }

    return prompt;
  }

  // Get available languages
  getLanguages() {
    if (!this.loaded || !this.settings) {
      return [];
    }
    return this.settings.languages || [];
  }

  // Get specific language by code
  getLanguage(code) {
    const languages = this.getLanguages();
    return languages.find(lang => lang.code === code);
  }

  // Get API configuration
  getAPIConfig() {
    if (!this.loaded || !this.settings) {
      console.warn('Settings not loaded, using defaults');
      return {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-4o-mini',
        apiKey: 'YOUR_OPENROUTER_API_KEY_HERE'
      };
    }
    return this.settings.api;
  }

  // Get UI configuration
  getUIConfig() {
    if (!this.loaded || !this.settings) {
      return {
        defaultMode: 'rewrite',
        defaultAccount: 'account1',
        showPreview: true,
        autoClose: false
      };
    }
    return this.settings.ui;
  }

  // Fallback prompt if settings not loaded
  getFallbackPrompt(mode, tweetText, additionalContext) {
    const prompts = {
      rewrite: "Rewrite the following tweet in an engaging and professional way. Keep it concise and within Twitter's character limit. Original tweet:",
      reply: "Generate a thoughtful and engaging reply to the following tweet. Keep it concise and conversational. Tweet to reply to:"
    };

    let prompt = (prompts[mode] || prompts.rewrite) + `\n\n"${tweetText}"`;

    if (additionalContext) {
      prompt += `\n\nAdditional context: ${additionalContext}`;
    }

    return prompt;
  }

  // Get default settings structure
  getDefaultSettings() {
    return {
      accounts: [
        {
          id: "account1",
          name: "Account 1",
          displayName: "Default Account",
          enabled: true,
          writingProfile: {
            tone: "professional",
            style: "clear and concise",
            personality: "Professional communicator",
            guidelines: ["Be clear", "Be concise", "Be engaging"],
            avoid: ["Jargon", "Excessive hashtags"],
            targetAudience: "General audience",
            contentFocus: ["General topics"],
            voiceCharacteristics: {
              formality: "semi-formal",
              humor: "subtle",
              enthusiasm: "moderate",
              technical: "moderate"
            }
          }
        }
      ],
      modes: {
        rewrite: {
          name: "Rewrite",
          promptTemplate: "Rewrite the following tweet professionally:"
        },
        reply: {
          name: "Reply",
          promptTemplate: "Generate a reply to the following tweet:"
        }
      },
      api: {
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        model: "openai/gpt-4o-mini",
        apiKey: "YOUR_OPENROUTER_API_KEY_HERE"
      },
      ui: {
        defaultMode: "rewrite",
        defaultAccount: "account1",
        showPreview: true,
        autoClose: false
      }
    };
  }
}

// Export singleton instance
const settingsManager = new SettingsManager();
