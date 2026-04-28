/* global settingsManager, apiClient */
// Import settings manager and API client
importScripts('settings-manager.js', 'api-client.js');

// Initialize settings on extension load
let settingsLoaded = false;

// Load settings when background script starts
(async () => {
  await settingsManager.load();
  await apiClient.init();

  // Load saved model settings from chrome.storage
  chrome.storage.local.get(['contentModel', 'imageModel'], (result) => {
    if (result.contentModel && settingsManager.settings?.api) {
      settingsManager.settings.api.model = result.contentModel;
      console.log('Loaded saved content model:', result.contentModel);
    }
    if (result.imageModel && settingsManager.settings?.modes?.describe_image) {
      settingsManager.settings.modes.describe_image.model = result.imageModel;
      console.log('Loaded saved image model:', result.imageModel);
    }
  });

  settingsLoaded = true;
  console.log('[Extension] Settings loaded - using API-only mode');
})();

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSelectionToMemory",
    title: "Save selection to My Memory",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "savePageToMemory",
    title: "Save page to My Memory",
    contexts: ["page"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "saveSelectionToMemory") {
    await saveMemoryData({
      text: info.selectionText || '',
      sourceType: 'text',
      context: getTabContext(tab),
      tag: 'selection'
    });
    return;
  }

  if (info.menuItemId === "savePageToMemory") {
    await saveMemoryData({
      text: tab.url || '',
      sourceType: 'url',
      context: getTabContext(tab),
      tag: 'url'
    });
  }
});

// Get user ID - single user app
function getUserId() {
  return 'michal_main_user';
}

// Get webhook config from settings
function getWebhookConfig() {
  return settingsManager.settings?.webhook || { enabled: false };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ping/health check to wake up service worker
  if (request.action === "ping") {
    sendResponse({
      status: "ok",
      timestamp: Date.now(),
      backend: apiClient?.baseUrl || "not initialized",
      dashboardUrl: getDashboardUrl()
    });
    return true;
  }

  if (request.action === "getAppInfo") {
    sendResponse({
      success: true,
      backend: apiClient?.baseUrl || "not initialized",
      dashboardUrl: getDashboardUrl()
    });
    return true;
  }

  if (request.action === "savePageToMemory") {
    (async () => {
      try {
        const tab = request.data?.tab || {};
        const result = await saveMemoryData({
          text: tab.url || request.data?.url,
          sourceType: 'url',
          context: request.data?.context || getTabContext(tab),
          tag: request.data?.tag || 'url',
          priority: request.data?.priority
        });
        sendResponse({ success: true, result });
      } catch (error) {
        sendResponse({ success: false, error: error.message || 'Failed to save page' });
      }
    })();
    return true;
  }

  if (request.action === "saveNoteToMemory") {
    (async () => {
      try {
        const result = await saveMemoryData({
          text: request.data?.text,
          sourceType: 'text',
          context: request.data?.context || {},
          tag: request.data?.tag || 'note',
          priority: request.data?.priority
        });
        sendResponse({ success: true, result });
      } catch (error) {
        sendResponse({ success: false, error: error.message || 'Failed to save note' });
      }
    })();
    return true;
  }

  // Process text with AI
  if (request.action === "processText") {
    (async () => {
      try {
        const { text, context, mode, actionParams, account, language, comment, sendWebhook, imageData } = request.data;

        // API key is now stored on backend - no need to check here
        // Get API configuration from settings
        const apiConfig = settingsManager.getAPIConfig();

        // Check if this is an image processing request
        const isImageMode = mode === 'describe_image' && imageData;

        // Use Gemini for image processing, default model for text
        const modelToUse = isImageMode
          ? (settingsManager.settings?.modes?.describe_image?.model || 'google/gemini-2.0-flash-exp:free')
          : apiConfig.model;

        // Build the prompt using settings manager with action parameters (now async)
        let fullPrompt = await settingsManager.buildPrompt(
          mode,
          account,
          text,
          comment,
          language,
          actionParams || {}
        );

        // Enhance prompt based on detail level for images
        if (isImageMode && actionParams?.detailLevel) {
          const detailInstructions = {
            standard: '',
            detailed: '\n\nProvide extensive details about every visible element, textures, patterns, and nuances.',
            technical: '\n\nFocus on technical photography aspects: camera settings, lighting setup, lens characteristics, composition techniques, and technical specifications.',
            artistic: '\n\nFocus on artistic elements: color theory, visual balance, emotional impact, design principles, and creative techniques used.'
          };
          fullPrompt += detailInstructions[actionParams.detailLevel] || '';
        }

        console.log("[My Memory] Processing:", {
          mode,
          account,
          language,
          actionParams,
          model: modelToUse,
          isImage: isImageMode
        });

        // Prepare message content for API
        let messageContent;
        if (isImageMode && imageData) {
          // For image processing, send both text and image
          // Using OpenRouter SDK format (camelCase)
          messageContent = [
            {
              type: "text",
              text: fullPrompt
            },
            {
              type: "image_url",
              imageUrl: {
                url: imageData.substring(0, 100) + '...[truncated]' // Log only first 100 chars of base64
              }
            }
          ];
        } else {
          // For text processing, send only text
          messageContent = fullPrompt;
        }

        // Prepare request body
        const requestBody = {
          model: modelToUse,
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ]
        };

        // Log full request details
        console.log("=".repeat(80));
        console.log("[OpenRouter Request] Starting API call");
        console.log("=".repeat(80));
        console.log("📤 REQUEST DETAILS:");
        console.log("  • Endpoint:", apiConfig.endpoint);
        console.log("  • Model:", modelToUse);
        console.log("  • Mode:", mode);
        console.log("  • Is Image:", isImageMode);
        console.log("  • Timestamp:", new Date().toISOString());
        console.log("\n📝 FULL PROMPT:");
        console.log(fullPrompt);
        console.log("\n⚙️ PARAMETERS:");
        console.log("  • Account:", account);
        console.log("  • Language:", language);
        console.log("  • Action Params:", JSON.stringify(actionParams, null, 2));
        console.log("  • Send Webhook:", sendWebhook);
        console.log("  • Comment:", comment || '(none)');

        if (isImageMode && imageData) {
          console.log("\n🖼️ IMAGE DATA:");
          console.log("  • Image URL:", imageData);
          console.log("  • Full URL (for debugging):", imageData);
          const isBase64 = imageData.startsWith('data:');
          console.log("  • Format:", isBase64 ? 'Base64 Data URL' : 'Direct URL');
          if (isBase64) {
            console.log("  • Size:", imageData.length, "characters");
            console.log("  • Estimated KB:", Math.round(imageData.length / 1024), "KB");
          } else {
            console.log("  • URL length:", imageData.length, "characters");
            // Check if URL is accessible
            console.log("  • URL protocol:", new URL(imageData).protocol);
            console.log("  • URL host:", new URL(imageData).hostname);
            console.log("  • URL pathname:", new URL(imageData).pathname);
          }
        }

        console.log("\n📦 REQUEST BODY:");
        // Create a safe copy for logging (truncate base64 if present)
        const logBody = JSON.parse(JSON.stringify(requestBody));
        if (isImageMode && logBody.messages[0].content[1]) {
          const url = logBody.messages[0].content[1].imageUrl.url;
          if (url.startsWith('data:')) {
            logBody.messages[0].content[1].imageUrl.url = url.substring(0, 100) + '...[base64 data truncated]';
          }
          // Direct URLs are logged as-is
        }
        console.log(JSON.stringify(logBody, null, 2));
        console.log("=".repeat(80));

        // Prepare actual request body with full image data
        const actualRequestBody = {
          model: modelToUse,
          messages: [
            {
              role: "user",
              content: isImageMode && imageData ? [
                {
                  type: "text",
                  text: fullPrompt
                },
                {
                  type: "image_url",
                  imageUrl: {
                    url: imageData  // Full base64 data
                  }
                }
              ] : fullPrompt
            }
          ]
        };

        // Call backend proxy (uses API key stored on backend)
        const backendUrl = settingsManager.settings?.backend?.baseUrl || 'https://my-memory.kureckamichal.workers.dev';
        const proxyEndpoint = `${backendUrl}/api/proxy/openrouter`;

        console.log("[Extension] Using backend proxy:", proxyEndpoint);

        const response = await fetch(proxyEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(actualRequestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log("=".repeat(80));
          console.log("❌ [OpenRouter Response] API ERROR");
          console.log("=".repeat(80));
          console.log("  • Status:", response.status, response.statusText);
          console.log("  • Error Body:", errorText);
          console.log("  • Timestamp:", new Date().toISOString());
          console.log("=".repeat(80));
          throw new Error(`API error (${response.status}): ${errorText}`);
        }

        const responseData = await response.json();

        // Backend proxy wraps response in {success, data} - unwrap it
        const data = responseData.data || responseData;

        // Log successful response
        console.log("=".repeat(80));
        console.log("✅ [Backend Proxy Response] SUCCESS");
        console.log("=".repeat(80));
        console.log("📥 RESPONSE DETAILS:");
        console.log("  • Status:", response.status, response.statusText);
        console.log("  • Timestamp:", new Date().toISOString());

        if (data.usage) {
          console.log("\n📊 TOKEN USAGE:");
          console.log("  • Prompt tokens:", data.usage.prompt_tokens);
          console.log("  • Completion tokens:", data.usage.completion_tokens);
          console.log("  • Total tokens:", data.usage.total_tokens);
        }

        if (data.model) {
          console.log("\n🤖 MODEL INFO:");
          console.log("  • Model used:", data.model);
        }

        console.log("\n📦 FULL RESPONSE:");
        console.log(JSON.stringify(data, null, 2));

        // Check for error in response (from proxy or OpenRouter)
        if (responseData.error || data.error) {
          const error = responseData.error || data.error;
          console.log("\n❌ ERROR IN RESPONSE:");
          console.error(error);
          console.log("=".repeat(80));
          throw new Error(error.message || JSON.stringify(error));
        }

        // Extract content from response
        let generatedContent = null;
        if (data.choices && data.choices[0] && data.choices[0].message) {
          generatedContent = data.choices[0].message.content;
        } else if (data.choices && data.choices[0] && data.choices[0].text) {
          // Some models return text instead of message.content
          generatedContent = data.choices[0].text;
        } else {
          console.log("\n❌ UNEXPECTED RESPONSE STRUCTURE");
          console.error("Response data:", data);
          console.log("=".repeat(80));
          throw new Error("Invalid response format. Check console for details.");
        }

        if (!generatedContent) {
          console.log("\n❌ NO CONTENT GENERATED");
          console.log("=".repeat(80));
          throw new Error("No content generated from AI");
        }

        console.log("\n✨ GENERATED CONTENT:");
        console.log(generatedContent);
        console.log("\n📏 CONTENT LENGTH:", generatedContent.length, "characters");
        console.log("=".repeat(80));

        // Send webhook if enabled
        if (sendWebhook) {
          await sendWebhookNotification('processText', {
            originalText: text,
            generatedContent: generatedContent,
            mode: mode,
            account: account,
            language: language,
            context: context
          });
        }

        sendResponse({ success: true, content: generatedContent });

      } catch (error) {
        console.error("Error calling OpenRouter:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  // Legacy support for generateContent
  if (request.action === "generateContent") {
    chrome.runtime.sendMessage({
      action: "processText",
      data: request.data
    }, (response) => {
      sendResponse(response);
    });
    return true;
  }

  // Handle API key setup/update
  if (request.action === "setApiKey") {
    const { apiKey } = request.data;

    chrome.storage.local.set({ openrouterApiKey: apiKey }, () => {
      console.log("API key saved successfully");
      sendResponse({ success: true });
    });

    return true;
  }

  // Handle API key retrieval (for settings UI)
  if (request.action === "getApiKey") {
    chrome.storage.local.get(['openrouterApiKey'], (result) => {
      sendResponse({
        success: true,
        apiKey: result.openrouterApiKey || null,
        hasKey: !!result.openrouterApiKey
      });
    });

    return true;
  }

  // Save settings (API key + models + webhook + custom prompts)
  if (request.action === "saveSettings") {
    (async () => {
      const { apiKey, contentModel, imageModel, customPrompts, webhook } = request.data;

      // Save API key if provided
      if (apiKey) {
        await new Promise((resolve) => {
          chrome.storage.local.set({ openrouterApiKey: apiKey }, resolve);
        });
      }

      // Save model settings to chrome.storage
      const modelSettings = {};
      if (contentModel) {
        modelSettings.contentModel = contentModel;
      }
      if (imageModel) {
        modelSettings.imageModel = imageModel;
      }

      if (Object.keys(modelSettings).length > 0) {
        await new Promise((resolve) => {
          chrome.storage.local.set(modelSettings, resolve);
        });
      }

      // Save custom prompts to chrome.storage
      if (customPrompts) {
        await new Promise((resolve) => {
          chrome.storage.local.set({ customPrompts }, resolve);
        });
      }

      // Update settings in memory
      if (settingsManager.settings) {
        // Update webhook settings
        settingsManager.settings.webhook = {
          ...settingsManager.settings.webhook,
          ...webhook
        };

        // Update model settings
        if (contentModel) {
          settingsManager.settings.api.model = contentModel;
        }
        if (imageModel && settingsManager.settings.modes?.describe_image) {
          settingsManager.settings.modes.describe_image.model = imageModel;
        }
      }

      console.log("Settings saved successfully:", {
        hasApiKey: !!apiKey,
        contentModel,
        imageModel,
        webhook: webhook?.enabled
      });
      sendResponse({ success: true });
    })();

    return true;
  }

  // Save to memory only (no processing)
  if (request.action === "saveToMemory") {
    (async () => {
      try {
        const result = await saveMemoryData({
          text: request.data.text,
          sourceType: request.data.sourceType,
          context: request.data.context,
          tag: request.data.tag || request.data.context?.tag,
          priority: request.data.priority || request.data.context?.priority,
          savedAt: request.data.savedAt
        });

        sendResponse({ success: true, message: 'Saved to memory', result });
      } catch (error) {
        console.error('[Extension] Failed to save to memory:', error);
        sendResponse({ success: false, error: error.message || 'Failed to save' });
      }
    })();
    return true;
  }

  // Save processed text via webhook
  if (request.action === "saveProcessedText") {
    (async () => {
      await sendWebhookNotification('processText', {
        originalText: request.data.originalText,
        generatedContent: request.data.generatedOutput,
        mode: request.data.mode,
        account: request.data.account,
        language: request.data.language,
        context: request.data.context || {}
      });
      sendResponse({ success: true, message: 'Saved to backend' });
    })();
    return true;
  }

  // Legacy - redirect to processText webhook
  if (request.action === "saveToDatabase") {
    (async () => {
      await sendWebhookNotification('processText', {
        originalText: request.data.originalText,
        generatedContent: request.data.generatedOutput,
        mode: request.data.mode,
        language: request.data.language,
        context: {}
      });
      sendResponse({ success: true, message: 'Saved to backend' });
    })();
    return true;
  }

  if (request.action === "getAllPosts") {
    sendResponse({ error: 'View data on dashboard: https://my-memory.kureckamichal.workers.dev/dashboard' });
    return true;
  }

  if (request.action === "getStats") {
    sendResponse({ error: 'View stats on dashboard: https://my-memory.kureckamichal.workers.dev/dashboard' });
    return true;
  }

  if (request.action === "updatePostStatus") {
    sendResponse({ error: 'Not supported - use dashboard' });
    return true;
  }

  if (request.action === "deletePost") {
    sendResponse({ error: 'Not supported - use dashboard' });
    return true;
  }

  if (request.action === "exportDatabase") {
    sendResponse({ error: 'View/export data on dashboard' });
    return true;
  }

  if (request.action === "saveTweet") {
    (async () => {
      const tweetData = request.data;

      // Send directly to backend via webhook
      await sendWebhookNotification('onSaveTweet', {
        data: {
          tweetId: tweetData.tweetId,
          text: tweetData.text,
          author: {
            name: tweetData.author.name,
            username: tweetData.author.handle,
            handle: tweetData.author.handle,
            url: tweetData.author.url
          },
          url: tweetData.url,
          timestamp: tweetData.timestamp,
          media: tweetData.media,
          metadata: tweetData.metadata
        }
      });

      console.log('[Extension] Tweet saved to backend:', tweetData.tweetId);
      sendResponse({ success: true, message: 'Tweet saved to backend' });
    })();
    return true;
  }

  if (request.action === "saveYouTubeVideo") {
    (async () => {
      try {
        const videoData = request.data;
        const backendUrl = settingsManager.settings?.backend?.baseUrl || 'https://my-memory.kureckamichal.workers.dev';

        // Fetch enriched video data from backend (stats, thumbnails, etc.)
        let enrichedData = null;
        try {
          const apiResponse = await fetch(`${backendUrl}/api/proxy/youtube/transcript/${videoData.videoId}`);
          if (apiResponse.ok) {
            const apiResult = await apiResponse.json();
            if (apiResult.success) {
              enrichedData = apiResult.data;
              console.log('[Extension] Fetched YouTube stats:', enrichedData.statistics);
            }
          }
        } catch (apiError) {
          console.log('[Extension] Could not fetch YouTube API data:', apiError.message);
        }

        // Merge client-side data with API data (prefer client-side transcript if available)
        const mergedData = {
          videoId: videoData.videoId,
          url: enrichedData?.url || videoData.url,
          title: enrichedData?.title || videoData.title,
          description: enrichedData?.description || videoData.description,
          channel: enrichedData?.channel || videoData.channel,
          publishedAt: enrichedData?.publishedAt || null,
          duration: enrichedData?.duration || null,
          statistics: enrichedData?.statistics || null,
          thumbnails: enrichedData?.thumbnails || null,
          tags: enrichedData?.tags || [],
          definition: enrichedData?.definition || null,
          hasCaptions: enrichedData?.hasCaptions || false,
          // Prefer client-side transcript (extracted from open panel) over API
          transcript: (videoData.transcript?.available && videoData.transcript?.text)
            ? videoData.transcript
            : enrichedData?.transcript || { available: false, text: null, source: 'none' },
          metadata: {
            ...videoData.metadata,
            capturedAt: new Date().toISOString(),
            source: 'extension'
          }
        };

        // Send enriched data to backend via webhook
        await sendWebhookNotification('onSaveYouTubeVideo', {
          data: mergedData
        });

        console.log('[Extension] Video saved to backend:', videoData.videoId, {
          hasTranscript: mergedData.transcript?.available,
          transcriptWords: mergedData.transcript?.wordCount || 0,
          views: mergedData.statistics?.viewsFormatted || 'N/A'
        });

        sendResponse({
          success: true,
          message: 'Video saved to backend',
          stats: mergedData.statistics
        });
      } catch (error) {
        console.error('[Extension] Error saving video:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    return true;
  }

});

async function saveMemoryData({ text, sourceType, context = {}, tag, priority, savedAt }) {
  const content = (text || '').trim();
  if (!content) {
    throw new Error('Nothing to save');
  }

  return apiClient.ingestMemory({
    sourceType: sourceType || inferSourceType(content, context),
    content,
    context,
    metadata: {
      savedAt: savedAt || new Date().toISOString(),
      source: 'extension'
    },
    tag,
    priority
  });
}

function inferSourceType(text, context = {}) {
  if (context.type === 'image') return 'image';
  if (/^https?:\/\/[^\s]+$/.test((text || '').trim())) return 'url';
  return 'text';
}

function getTabContext(tab = {}) {
  return {
    url: tab.url,
    pageTitle: tab.title,
    timestamp: new Date().toISOString()
  };
}

function getDashboardUrl(path = '/dashboard') {
  const baseUrl = settingsManager.settings?.backend?.baseUrl || apiClient?.baseUrl || 'https://my-memory.kureckamichal.workers.dev';
  return `${baseUrl}${path}`;
}

// Webhook notification function
async function sendWebhookNotification(eventType, payload) {
  try {
    const webhookConfig = getWebhookConfig();

    if (!webhookConfig || !webhookConfig.enabled) {
      console.log('[Extension] Webhook disabled or not configured');
      return;
    }

    if (!webhookConfig.url) {
      console.warn('[Extension] Webhook URL not configured');
      return;
    }

    // Get userId to include in webhook
    const userId = getUserId();

    // Format payload correctly for backend
    const webhookPayload = {
      event: eventType,
      userId: userId,
      data: payload,  // Wrap payload in "data" object
      timestamp: new Date().toISOString(),
      source: 'universal-text-processor-extension'
    };

    console.log('[Extension] Sending webhook:', eventType, 'userId:', userId);

    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    if (response.ok) {
      console.log(`[Extension] Webhook sent successfully for ${eventType}:`, response.status);
      return true;
    } else {
      const errorMsg = `Webhook failed: ${response.status} ${response.statusText}`;
      console.error(`[Extension] ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('[Extension] Webhook error:', error);
    throw error; // Re-throw so caller knows it failed
  }
}
