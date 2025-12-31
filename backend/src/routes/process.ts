import { Hono } from 'hono';
import type { Env, ProcessTextRequest, ProcessImageRequest, ProcessResponse } from '../types';
import { verifyJWT } from '../utils/jwt';
import { authMiddleware as baseAuthMiddleware } from '../utils/auth';
import { generateId } from '../utils/id';

const process = new Hono<{ Bindings: Env }>();

// Extended authentication middleware that also sets email and tier
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ success: false, error: 'No authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('userEmail', payload.email);
  c.set('userTier', payload.tier);

  await next();
}

// POST /api/process/text
process.post('/text', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const requestBody: ProcessTextRequest = await c.req.json();
    const { text, mode, account, language, actionParams, comment, sendWebhook, context } = requestBody;

    if (!text || !mode) {
      return c.json({ success: false, error: 'Text and mode are required' }, 400);
    }

    // Get user settings for custom prompts and models
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let settings = {};
    if (user?.settings_json) {
      try {
        settings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Build prompt (this would integrate with your settings-manager logic)
    const prompt = buildPrompt(mode, text, language, comment, actionParams, settings);

    // Get model from settings or use default
    const model = (settings as any)?.models?.contentModel || 'anthropic/claude-3.5-sonnet';

    // Call OpenRouter API
    const startTime = Date.now();
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'My Memory',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.text();
      console.error('OpenRouter API error:', error);

      // Log failed request
      await logApiRequest(c.env.DB, userId, '/api/process/text', model, mode, null, responseTime, openRouterResponse.status, error);

      return c.json({
        success: false,
        error: 'Failed to process text',
      }, openRouterResponse.status);
    }

    const result = await openRouterResponse.json();
    const content = result.choices?.[0]?.message?.content || '';
    const usage = result.usage;

    // Create post in database
    const postId = generateId();
    const now = Date.now();

    await c.env.DB
      .prepare(`
        INSERT INTO posts (id, user_id, type, mode, account, original_text, generated_output, language, status, context_json, created_at)
        VALUES (?, ?, 'processed', ?, ?, ?, ?, ?, 'pending', ?, ?)
      `)
      .bind(
        postId,
        userId,
        mode,
        account || null,
        text,
        content,
        language || null,
        context ? JSON.stringify(context) : null,
        now
      )
      .run();

    // Log successful request
    await logApiRequest(c.env.DB, userId, '/api/process/text', model, mode, usage, responseTime, 200, null);

    // Send webhook if enabled
    if (sendWebhook) {
      await sendWebhookNotification(c.env, userId, 'post.created', { postId, mode, content });
    }

    const response: ProcessResponse = {
      success: true,
      content,
      postId,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Process text error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to process text',
    }, 500);
  }
});

// POST /api/process/image
process.post('/image', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const requestBody: ProcessImageRequest = await c.req.json();
    const { imageUrl, mode, actionParams, context } = requestBody;

    if (!imageUrl || !mode) {
      return c.json({ success: false, error: 'Image URL and mode are required' }, 400);
    }

    // Get user settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let settings = {};
    if (user?.settings_json) {
      try {
        settings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Get image model from settings
    const model = (settings as any)?.models?.imageModel || 'google/gemini-2.0-flash-001';

    // Build prompt
    const prompt = buildImagePrompt(mode, actionParams, settings);

    // Call OpenRouter API with image
    const startTime = Date.now();
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'My Memory',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.text();
      console.error('OpenRouter API error:', error);

      await logApiRequest(c.env.DB, userId, '/api/process/image', model, mode, null, responseTime, openRouterResponse.status, error);

      return c.json({
        success: false,
        error: 'Failed to process image',
      }, openRouterResponse.status);
    }

    const result = await openRouterResponse.json();
    const content = result.choices?.[0]?.message?.content || '';
    const usage = result.usage;

    // Create post in database
    const postId = generateId();
    const now = Date.now();

    const postContext = {
      ...context,
      imageSrc: imageUrl,
    };

    await c.env.DB
      .prepare(`
        INSERT INTO posts (id, user_id, type, mode, original_text, generated_output, status, context_json, created_at)
        VALUES (?, ?, 'processed', ?, ?, ?, 'pending', ?, ?)
      `)
      .bind(
        postId,
        userId,
        mode,
        imageUrl,
        content,
        JSON.stringify(postContext),
        now
      )
      .run();

    // Log successful request
    await logApiRequest(c.env.DB, userId, '/api/process/image', model, mode, usage, responseTime, 200, null);

    const response: ProcessResponse = {
      success: true,
      content,
      postId,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Process image error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to process image',
    }, 500);
  }
});

// Helper function to build prompt
function buildPrompt(
  mode: string,
  text: string,
  language?: string,
  comment?: string,
  actionParams?: Record<string, any>,
  settings?: any
): string {
  // Check for custom prompt
  const customPrompts = settings?.customPrompts || {};
  let template = customPrompts[mode];

  // If no custom prompt, use defaults
  if (!template) {
    const defaults: Record<string, string> = {
      rewrite_twitter: 'Rewrite this text for Twitter/X. Make it engaging and concise:\n\n{text}',
      article: 'Transform this into a well-structured article:\n\n{text}',
      summarize: 'Summarize the following text:\n\n{text}',
      translate: 'Translate this text to {language}:\n\n{text}',
      extract_insights: 'Extract key insights from this text:\n\n{text}',
    };
    template = defaults[mode] || 'Process this text:\n\n{text}';
  }

  // Replace placeholders
  let prompt = template
    .replace(/\{text\}/g, text)
    .replace(/\{language\}/g, language || 'English');

  if (comment) {
    prompt += `\n\nAdditional context: ${comment}`;
  }

  return prompt;
}

// Helper function to build image prompt
function buildImagePrompt(
  mode: string,
  actionParams?: Record<string, any>,
  settings?: any
): string {
  const customPrompts = settings?.customPrompts || {};
  let template = customPrompts.describe_image;

  if (!template) {
    template = 'Describe this image in detail. Focus on the main elements, composition, and any notable features.';
  }

  return template;
}

// Helper function to log API requests
async function logApiRequest(
  db: D1Database,
  userId: string,
  endpoint: string,
  model: string,
  mode: string,
  usage: any,
  responseTime: number,
  statusCode: number,
  errorMessage: string | null
): Promise<void> {
  try {
    const requestId = generateId();
    await db
      .prepare(`
        INSERT INTO api_requests (
          id, user_id, endpoint, model, mode,
          prompt_tokens, completion_tokens, total_tokens,
          response_time_ms, status_code, error_message, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        requestId,
        userId,
        endpoint,
        model,
        mode,
        usage?.prompt_tokens || null,
        usage?.completion_tokens || null,
        usage?.total_tokens || null,
        responseTime,
        statusCode,
        errorMessage,
        Date.now()
      )
      .run();
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

// Helper function to send webhook
async function sendWebhookNotification(
  env: Env,
  userId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    const webhook = await env.DB
      .prepare('SELECT url, secret FROM webhooks WHERE user_id = ? AND enabled = 1')
      .bind(userId)
      .first<any>();

    if (!webhook) return;

    const payload = {
      event,
      data,
      timestamp: Date.now(),
    };

    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhook.secret || '',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Webhook notification failed:', error);
  }
}

export default process;
