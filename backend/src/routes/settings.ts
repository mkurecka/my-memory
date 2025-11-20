import { Hono } from 'hono';
import type { Env, UserSettings } from '../types';
import { verifyJWT } from '../utils/jwt';

const settings = new Hono<{ Bindings: Env }>();

// Authentication middleware
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
  await next();
}

// GET /api/settings - Get user settings
settings.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    let userSettings: UserSettings = {};
    if (user.settings_json) {
      try {
        userSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    return c.json({
      success: true,
      settings: userSettings,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get settings',
    }, 500);
  }
});

// PUT /api/settings - Update user settings
settings.put('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const newSettings: UserSettings = await c.req.json();

    // Validate settings structure
    if (typeof newSettings !== 'object') {
      return c.json({
        success: false,
        error: 'Invalid settings format',
      }, 400);
    }

    const settingsJson = JSON.stringify(newSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: newSettings,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update settings',
    }, 500);
  }
});

// PATCH /api/settings - Partial update user settings
settings.patch('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const partialSettings = await c.req.json();

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    let currentSettings: UserSettings = {};
    if (user.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Merge settings
    const mergedSettings = deepMerge(currentSettings, partialSettings);
    const settingsJson = JSON.stringify(mergedSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: mergedSettings,
    });
  } catch (error: any) {
    console.error('Patch settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update settings',
    }, 500);
  }
});

// PUT /api/settings/models - Update model settings
settings.put('/models', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { contentModel, imageModel } = await c.req.json();

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let currentSettings: UserSettings = {};
    if (user?.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Update models
    currentSettings.models = {
      contentModel: contentModel || currentSettings.models?.contentModel,
      imageModel: imageModel || currentSettings.models?.imageModel,
    };

    const settingsJson = JSON.stringify(currentSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Model settings updated successfully',
      models: currentSettings.models,
    });
  } catch (error: any) {
    console.error('Update models error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update models',
    }, 500);
  }
});

// PUT /api/settings/webhook - Update webhook settings
settings.put('/webhook', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { enabled, url } = await c.req.json();

    if (enabled && !url) {
      return c.json({
        success: false,
        error: 'Webhook URL is required when enabled',
      }, 400);
    }

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let currentSettings: UserSettings = {};
    if (user?.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Update webhook
    currentSettings.webhook = {
      enabled: !!enabled,
      url: url || currentSettings.webhook?.url,
    };

    const settingsJson = JSON.stringify(currentSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Webhook settings updated successfully',
      webhook: currentSettings.webhook,
    });
  } catch (error: any) {
    console.error('Update webhook error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update webhook',
    }, 500);
  }
});

// Helper function to deep merge objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

export default settings;
