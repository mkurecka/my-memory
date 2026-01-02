/**
 * Social Posts Routes - API endpoints for social media post management
 * Connects to Social Posts Airtable base for content data
 */

import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types';
import { SocialPostsService, SocialProfile, SocialPost, SocialTemplate, SocialImage } from '../services/social-posts';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/social-posts/summary
 * Get Social Posts dashboard summary stats
 */
app.get('/summary', async (c) => {
  try {
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    if (!social.isConfigured()) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Social Posts Airtable not configured',
        message: 'Missing Airtable API key'
      }, 500);
    }

    const summary = await social.getSummary(!noCache);

    return c.json<ApiResponse>({
      success: true,
      data: summary
    });
  } catch (err: any) {
    console.error('[Social Routes] Error getting summary:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to get summary'
    }, 500);
  }
});

// ============================================
// PROFILES
// ============================================

/**
 * GET /api/social-posts/profiles
 * List all profiles
 */
app.get('/profiles', async (c) => {
  try {
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const profiles = await social.listProfiles(!noCache);

    return c.json<ApiResponse<SocialProfile[]>>({
      success: true,
      data: profiles,
      message: `Retrieved ${profiles.length} profiles`
    });
  } catch (err: any) {
    console.error('[Social Routes] Error listing profiles:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list profiles'
    }, 500);
  }
});

/**
 * GET /api/social-posts/profiles/:id
 * Get single profile
 */
app.get('/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const profile = await social.getProfile(profileId, !noCache);

    if (!profile) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Profile ${profileId} not found`
      }, 404);
    }

    return c.json<ApiResponse<SocialProfile>>({
      success: true,
      data: profile
    });
  } catch (err: any) {
    console.error('[Social Routes] Error fetching profile:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch profile'
    }, 500);
  }
});

/**
 * PATCH /api/social-posts/profiles/:id
 * Update profile fields
 */
app.patch('/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    const updates = await c.req.json();
    const social = new SocialPostsService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const profile = await social.updateProfile(profileId, updates);

    if (!profile) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update profile ${profileId}`
      }, 500);
    }

    return c.json<ApiResponse<SocialProfile>>({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });
  } catch (err: any) {
    console.error('[Social Routes] Error updating profile:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update profile'
    }, 500);
  }
});

// ============================================
// POSTS
// ============================================

/**
 * GET /api/social-posts/posts
 * List all posts
 */
app.get('/posts', async (c) => {
  try {
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const posts = await social.listPosts(!noCache);

    return c.json<ApiResponse<SocialPost[]>>({
      success: true,
      data: posts,
      message: `Retrieved ${posts.length} posts`
    });
  } catch (err: any) {
    console.error('[Social Routes] Error listing posts:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list posts'
    }, 500);
  }
});

/**
 * GET /api/social-posts/posts/:id
 * Get single post with its images
 */
app.get('/posts/:id', async (c) => {
  try {
    const postId = c.req.param('id');
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const post = await social.getPost(postId, !noCache);

    if (!post) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Post ${postId} not found`
      }, 404);
    }

    // Get images for this post
    const images = await social.getPostImages(postId, !noCache);

    return c.json<ApiResponse>({
      success: true,
      data: {
        ...post,
        postImages: images
      }
    });
  } catch (err: any) {
    console.error('[Social Routes] Error fetching post:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch post'
    }, 500);
  }
});

/**
 * PATCH /api/social-posts/posts/:id
 * Update post fields
 */
app.patch('/posts/:id', async (c) => {
  try {
    const postId = c.req.param('id');
    const updates = await c.req.json();
    const social = new SocialPostsService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const post = await social.updatePost(postId, updates);

    if (!post) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update post ${postId}`
      }, 500);
    }

    return c.json<ApiResponse<SocialPost>>({
      success: true,
      data: post,
      message: 'Post updated successfully'
    });
  } catch (err: any) {
    console.error('[Social Routes] Error updating post:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update post'
    }, 500);
  }
});

// ============================================
// TEMPLATES
// ============================================

/**
 * GET /api/social-posts/templates
 * List all templates
 */
app.get('/templates', async (c) => {
  try {
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const templates = await social.listTemplates(!noCache);

    return c.json<ApiResponse<SocialTemplate[]>>({
      success: true,
      data: templates,
      message: `Retrieved ${templates.length} templates`
    });
  } catch (err: any) {
    console.error('[Social Routes] Error listing templates:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list templates'
    }, 500);
  }
});

/**
 * GET /api/social-posts/templates/:id
 * Get single template
 */
app.get('/templates/:id', async (c) => {
  try {
    const templateId = c.req.param('id');
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const template = await social.getTemplate(templateId, !noCache);

    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Template ${templateId} not found`
      }, 404);
    }

    return c.json<ApiResponse<SocialTemplate>>({
      success: true,
      data: template
    });
  } catch (err: any) {
    console.error('[Social Routes] Error fetching template:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch template'
    }, 500);
  }
});

/**
 * PATCH /api/social-posts/templates/:id
 * Update template fields
 */
app.patch('/templates/:id', async (c) => {
  try {
    const templateId = c.req.param('id');
    const updates = await c.req.json();
    const social = new SocialPostsService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const template = await social.updateTemplate(templateId, updates);

    if (!template) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update template ${templateId}`
      }, 500);
    }

    return c.json<ApiResponse<SocialTemplate>>({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (err: any) {
    console.error('[Social Routes] Error updating template:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update template'
    }, 500);
  }
});

// ============================================
// IMAGES
// ============================================

/**
 * GET /api/social-posts/images
 * List all images
 */
app.get('/images', async (c) => {
  try {
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const images = await social.listImages(!noCache);

    return c.json<ApiResponse<SocialImage[]>>({
      success: true,
      data: images,
      message: `Retrieved ${images.length} images`
    });
  } catch (err: any) {
    console.error('[Social Routes] Error listing images:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list images'
    }, 500);
  }
});

/**
 * GET /api/social-posts/images/:id
 * Get single image
 */
app.get('/images/:id', async (c) => {
  try {
    const imageId = c.req.param('id');
    const social = new SocialPostsService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const image = await social.getImage(imageId, !noCache);

    if (!image) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Image ${imageId} not found`
      }, 404);
    }

    return c.json<ApiResponse<SocialImage>>({
      success: true,
      data: image
    });
  } catch (err: any) {
    console.error('[Social Routes] Error fetching image:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch image'
    }, 500);
  }
});

/**
 * PATCH /api/social-posts/images/:id
 * Update image fields
 */
app.patch('/images/:id', async (c) => {
  try {
    const imageId = c.req.param('id');
    const updates = await c.req.json();
    const social = new SocialPostsService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const image = await social.updateImage(imageId, updates);

    if (!image) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update image ${imageId}`
      }, 500);
    }

    return c.json<ApiResponse<SocialImage>>({
      success: true,
      data: image,
      message: 'Image updated successfully'
    });
  } catch (err: any) {
    console.error('[Social Routes] Error updating image:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update image'
    }, 500);
  }
});

/**
 * POST /api/social-posts/cache/invalidate
 * Invalidate all Social Posts caches
 */
app.post('/cache/invalidate', async (c) => {
  try {
    const social = new SocialPostsService(c.env);

    await Promise.all([
      social.invalidateCache('profiles'),
      social.invalidateCache('posts'),
      social.invalidateCache('templates'),
      social.invalidateCache('images')
    ]);

    return c.json<ApiResponse>({
      success: true,
      message: 'Social Posts cache invalidated'
    });
  } catch (err: any) {
    console.error('[Social Routes] Error invalidating cache:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to invalidate cache'
    }, 500);
  }
});

export default app;
