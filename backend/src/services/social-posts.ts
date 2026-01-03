/**
 * Social Posts Service - Handles social media posts data from Airtable
 * Uses dedicated Social Posts Airtable base for content management
 */

import type { Env } from '../types';

// Social Posts Airtable configuration
const SOCIAL_BASE_ID = 'appFVInEpy7knVyWN';
const SOCIAL_TABLES = {
  profiles: 'tbljwIL34WVYedIrw',
  posts: 'tblVyLv9ksqIo6rgY',
  templates: 'tblbZq3Z0ElrVZ8Y6',
  images: 'tblYzFCmLG1NiONh0'
};

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export interface SocialProfile {
  id: string;
  name: string;
  platform?: string;
  handle?: string;
  url?: string;
  createdAt?: string;
  fields: Record<string, any>;
}

export interface SocialPost {
  id: string;
  title: string;
  content?: string;
  status?: string;
  platform?: string;
  scheduledAt?: string;
  publishedAt?: string;
  profileId?: string;
  templateId?: string;
  images?: string[];
  createdAt?: string;
  fields: Record<string, any>;
}

export interface SocialTemplate {
  id: string;
  name: string;
  content?: string;
  type?: string;
  platform?: string;
  createdAt?: string;
  fields: Record<string, any>;
}

export interface SocialImage {
  id: string;
  name: string;
  url?: string;
  thumbnailUrl?: string;
  postId?: string;
  postIds?: string[];
  createdAt?: string;
  fields: Record<string, any>;
}

export class SocialPostsService {
  private env: Env;
  private readonly CACHE_PREFIX = 'social:';
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Check if Social Posts Airtable is configured
   */
  isConfigured(): boolean {
    return Boolean(this.env.AIRTABLE_API_KEY);
  }

  /**
   * Make authenticated request to Airtable API for Social Posts base
   */
  private async airtableFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.env.AIRTABLE_API_KEY) {
      throw new Error('Airtable API key not configured');
    }

    const url = `${AIRTABLE_API_BASE}/${SOCIAL_BASE_ID}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Social] API error: ${response.status}`, error);
      throw new Error(`Airtable API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.env.CACHE.get(key, 'json');
      if (cached) {
        console.log(`[Social] Cache hit: ${key}`);
        return cached as T;
      }
      return null;
    } catch (error) {
      console.error(`[Social] Cache read error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache
   */
  private async setCache(key: string, data: any, ttl?: number): Promise<void> {
    try {
      await this.env.CACHE.put(
        key,
        JSON.stringify(data),
        { expirationTtl: ttl || this.DEFAULT_TTL }
      );
    } catch (error) {
      console.error(`[Social] Cache write error for ${key}:`, error);
    }
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(type: string, id?: string): Promise<void> {
    try {
      const key = id ? `${this.CACHE_PREFIX}${type}:${id}` : `${this.CACHE_PREFIX}${type}:all`;
      await this.env.CACHE.delete(key);
      if (id) {
        await this.env.CACHE.delete(`${this.CACHE_PREFIX}${type}:all`);
      }
    } catch (error) {
      console.error(`[Social] Cache invalidation error:`, error);
    }
  }

  // ============================================
  // PROFILES
  // ============================================

  /**
   * List all profiles
   */
  async listProfiles(useCache = true): Promise<SocialProfile[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}profiles:all`;

    if (useCache) {
      const cached = await this.getFromCache<SocialProfile[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Social] Fetching profiles');
      const result = await this.airtableFetch(SOCIAL_TABLES.profiles);

      const profiles: SocialProfile[] = (result.records || []).map((r: any) => ({
        id: r.id,
        name: r.fields.Name || r.fields.name || '',
        platform: r.fields.Platform || r.fields.platform,
        handle: r.fields.Handle || r.fields.handle,
        url: r.fields.URL || r.fields.url,
        createdAt: r.createdTime,
        fields: r.fields
      }));

      await this.setCache(cacheKey, profiles);
      console.log(`[Social] Fetched ${profiles.length} profiles`);
      return profiles;
    } catch (error: any) {
      console.error('[Social] Error fetching profiles:', error);
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }
  }

  /**
   * Get single profile
   */
  async getProfile(profileId: string, useCache = true): Promise<SocialProfile | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}profiles:${profileId}`;

    if (useCache) {
      const cached = await this.getFromCache<SocialProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Social] Fetching profile ${profileId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.profiles}/${profileId}`);

      const profile: SocialProfile = {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        platform: result.fields.Platform || result.fields.platform,
        handle: result.fields.Handle || result.fields.handle,
        url: result.fields.URL || result.fields.url,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, profile);
      return profile;
    } catch (error: any) {
      console.error(`[Social] Error fetching profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(profileId: string, fields: Record<string, any>): Promise<SocialProfile | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Social] Updating profile ${profileId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.profiles}/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('profiles', profileId);

      return {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        platform: result.fields.Platform || result.fields.platform,
        handle: result.fields.Handle || result.fields.handle,
        url: result.fields.URL || result.fields.url,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Social] Error updating profile ${profileId}:`, error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // ============================================
  // POSTS
  // ============================================

  /**
   * List all posts with pagination
   */
  async listPosts(useCache = true): Promise<SocialPost[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}posts:all`;

    if (useCache) {
      const cached = await this.getFromCache<SocialPost[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Social] Fetching posts with pagination');
      const allPosts: SocialPost[] = [];
      let offset: string | undefined;

      do {
        const url = offset ? `${SOCIAL_TABLES.posts}?offset=${offset}` : SOCIAL_TABLES.posts;
        const result = await this.airtableFetch(url);

        const posts: SocialPost[] = (result.records || []).map((r: any) => ({
          id: r.id,
          title: r.fields.Title || r.fields.title || r.fields.Name || r.fields.name || '',
          content: r.fields.Content || r.fields.content || r.fields.Text || r.fields.text,
          status: r.fields.Status || r.fields.status,
          platform: r.fields.Platform || r.fields.platform,
          scheduledAt: r.fields['Scheduled At'] || r.fields.scheduledAt,
          publishedAt: r.fields['Published At'] || r.fields.publishedAt,
          profileId: r.fields.Profile?.[0] || r.fields.profileId,
          templateId: r.fields.Template?.[0] || r.fields.templateId,
          images: r.fields.Images || r.fields.images,
          createdAt: r.createdTime,
          fields: r.fields
        }));

        allPosts.push(...posts);
        offset = result.offset;
        console.log(`[Social] Fetched ${posts.length} posts (total: ${allPosts.length})`);
      } while (offset);

      await this.setCache(cacheKey, allPosts);
      console.log(`[Social] Total posts fetched: ${allPosts.length}`);
      return allPosts;
    } catch (error: any) {
      console.error('[Social] Error fetching posts:', error);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Get single post
   */
  async getPost(postId: string, useCache = true): Promise<SocialPost | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}posts:${postId}`;

    if (useCache) {
      const cached = await this.getFromCache<SocialPost>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Social] Fetching post ${postId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.posts}/${postId}`);

      const post: SocialPost = {
        id: result.id,
        title: result.fields.Title || result.fields.title || result.fields.Name || result.fields.name || '',
        content: result.fields.Content || result.fields.content || result.fields.Text || result.fields.text,
        status: result.fields.Status || result.fields.status,
        platform: result.fields.Platform || result.fields.platform,
        scheduledAt: result.fields['Scheduled At'] || result.fields.scheduledAt,
        publishedAt: result.fields['Published At'] || result.fields.publishedAt,
        profileId: result.fields.Profile?.[0] || result.fields.profileId,
        templateId: result.fields.Template?.[0] || result.fields.templateId,
        images: result.fields.Images || result.fields.images,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, post);
      return post;
    } catch (error: any) {
      console.error(`[Social] Error fetching post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Update post
   */
  async updatePost(postId: string, fields: Record<string, any>): Promise<SocialPost | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Social] Updating post ${postId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.posts}/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('posts', postId);

      return {
        id: result.id,
        title: result.fields.Title || result.fields.title || result.fields.Name || result.fields.name || '',
        content: result.fields.Content || result.fields.content || result.fields.Text || result.fields.text,
        status: result.fields.Status || result.fields.status,
        platform: result.fields.Platform || result.fields.platform,
        scheduledAt: result.fields['Scheduled At'] || result.fields.scheduledAt,
        publishedAt: result.fields['Published At'] || result.fields.publishedAt,
        profileId: result.fields.Profile?.[0] || result.fields.profileId,
        templateId: result.fields.Template?.[0] || result.fields.templateId,
        images: result.fields.Images || result.fields.images,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Social] Error updating post ${postId}:`, error);
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * List all templates
   */
  async listTemplates(useCache = true): Promise<SocialTemplate[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}templates:all`;

    if (useCache) {
      const cached = await this.getFromCache<SocialTemplate[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Social] Fetching templates');
      const result = await this.airtableFetch(SOCIAL_TABLES.templates);

      const templates: SocialTemplate[] = (result.records || []).map((r: any) => ({
        id: r.id,
        name: r.fields.Name || r.fields.name || '',
        content: r.fields.Content || r.fields.content || r.fields.Template || r.fields.template,
        type: r.fields.Type || r.fields.type,
        platform: r.fields.Platform || r.fields.platform,
        createdAt: r.createdTime,
        fields: r.fields
      }));

      await this.setCache(cacheKey, templates);
      console.log(`[Social] Fetched ${templates.length} templates`);
      return templates;
    } catch (error: any) {
      console.error('[Social] Error fetching templates:', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
  }

  /**
   * Get single template
   */
  async getTemplate(templateId: string, useCache = true): Promise<SocialTemplate | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}templates:${templateId}`;

    if (useCache) {
      const cached = await this.getFromCache<SocialTemplate>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Social] Fetching template ${templateId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.templates}/${templateId}`);

      const template: SocialTemplate = {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        content: result.fields.Content || result.fields.content || result.fields.Template || result.fields.template,
        type: result.fields.Type || result.fields.type,
        platform: result.fields.Platform || result.fields.platform,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, template);
      return template;
    } catch (error: any) {
      console.error(`[Social] Error fetching template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, fields: Record<string, any>): Promise<SocialTemplate | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Social] Updating template ${templateId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.templates}/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('templates', templateId);

      return {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        content: result.fields.Content || result.fields.content || result.fields.Template || result.fields.template,
        type: result.fields.Type || result.fields.type,
        platform: result.fields.Platform || result.fields.platform,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Social] Error updating template ${templateId}:`, error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  // ============================================
  // IMAGES
  // ============================================

  /**
   * List all images with pagination
   */
  async listImages(useCache = true): Promise<SocialImage[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}images:all`;

    if (useCache) {
      const cached = await this.getFromCache<SocialImage[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Social] Fetching images with pagination');
      const allImages: SocialImage[] = [];
      let offset: string | undefined;

      do {
        const url = offset ? `${SOCIAL_TABLES.images}?offset=${offset}` : SOCIAL_TABLES.images;
        const result = await this.airtableFetch(url);

        const images: SocialImage[] = (result.records || []).map((r: any) => {
          const imageFile = r.fields['Image File']?.[0] || r.fields.Image?.[0] || r.fields.Attachment?.[0];
          const imgUrl = r.fields.imageUrl || r.fields.ImageUrl || r.fields.URL || r.fields.url || imageFile?.url;
          const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || imgUrl;
          // Get post IDs - can be single or array from SocialPosts field
          const postIds = r.fields.SocialPosts || r.fields.Post || [];

          return {
            id: r.id,
            name: r.fields.Name || r.fields.name || '',
            url: imgUrl,
            thumbnailUrl,
            postId: Array.isArray(postIds) ? postIds[0] : postIds,
            postIds: Array.isArray(postIds) ? postIds : [postIds].filter(Boolean),
            createdAt: r.createdTime,
            fields: r.fields
          };
        });

        allImages.push(...images);
        offset = result.offset;
        console.log(`[Social] Fetched ${images.length} images (total: ${allImages.length})`);
      } while (offset);

      await this.setCache(cacheKey, allImages);
      console.log(`[Social] Total images fetched: ${allImages.length}`);
      return allImages;
    } catch (error: any) {
      console.error('[Social] Error fetching images:', error);
      throw new Error(`Failed to fetch images: ${error.message}`);
    }
  }

  /**
   * Get images for a specific post
   */
  async getPostImages(postId: string, useCache = true): Promise<SocialImage[]> {
    const allImages = await this.listImages(useCache);
    return allImages.filter(img =>
      img.postIds?.includes(postId) || img.postId === postId
    );
  }

  /**
   * Get single image
   */
  async getImage(imageId: string, useCache = true): Promise<SocialImage | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}images:${imageId}`;

    if (useCache) {
      const cached = await this.getFromCache<SocialImage>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Social] Fetching image ${imageId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.images}/${imageId}`);

      const imageFile = result.fields['Image File']?.[0] || result.fields.Image?.[0] || result.fields.Attachment?.[0];
      const url = result.fields.imageUrl || result.fields.ImageUrl || result.fields.URL || result.fields.url || imageFile?.url;
      const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || url;
      const postIds = result.fields.SocialPosts || result.fields.Post || [];

      const image: SocialImage = {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        url,
        thumbnailUrl,
        postId: Array.isArray(postIds) ? postIds[0] : postIds,
        postIds: Array.isArray(postIds) ? postIds : [postIds].filter(Boolean),
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, image);
      return image;
    } catch (error: any) {
      console.error(`[Social] Error fetching image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Update image
   */
  async updateImage(imageId: string, fields: Record<string, any>): Promise<SocialImage | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Social] Updating image ${imageId}`);
      const result = await this.airtableFetch(`${SOCIAL_TABLES.images}/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('images', imageId);

      const imageFile = result.fields['Image File']?.[0] || result.fields.Image?.[0] || result.fields.Attachment?.[0];
      const url = result.fields.imageUrl || result.fields.ImageUrl || result.fields.URL || result.fields.url || imageFile?.url;
      const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || url;
      const postIds = result.fields.SocialPosts || result.fields.Post || [];

      return {
        id: result.id,
        name: result.fields.Name || result.fields.name || '',
        url,
        thumbnailUrl,
        postId: Array.isArray(postIds) ? postIds[0] : postIds,
        postIds: Array.isArray(postIds) ? postIds : [postIds].filter(Boolean),
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Social] Error updating image ${imageId}:`, error);
      throw new Error(`Failed to update image: ${error.message}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================

  /**
   * Get Social Posts dashboard summary
   */
  async getSummary(useCache = true): Promise<{
    profiles: number;
    posts: number;
    templates: number;
    images: number;
    postsByStatus: Record<string, number>;
  }> {
    const [profiles, posts, templates, images] = await Promise.all([
      this.listProfiles(useCache),
      this.listPosts(useCache),
      this.listTemplates(useCache),
      this.listImages(useCache)
    ]);

    // Count posts by status
    const postsByStatus: Record<string, number> = {};
    posts.forEach(post => {
      const status = post.status || 'Unknown';
      postsByStatus[status] = (postsByStatus[status] || 0) + 1;
    });

    return {
      profiles: profiles.length,
      posts: posts.length,
      templates: templates.length,
      images: images.length,
      postsByStatus
    };
  }
}
