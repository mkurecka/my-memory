/**
 * Etsy Service - Handles Etsy product/listing data from Airtable
 * Uses dedicated Etsy Airtable base for product management
 */

import type { Env } from '../types';

// Etsy Airtable configuration
const ETSY_BASE_ID = 'appbLHsvNO4hwgBnD';
const ETSY_TABLES = {
  products: 'tblHfhwObe65KeDfz',
  images: 'tblDXSNuNgNOZJGQl',
  listings: 'tblU8Qb0Sj6KtQXfE'
};

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export interface EtsyProduct {
  id: string;
  name: string;
  niche?: string;
  style?: string;
  productType?: string;
  quantity?: number;
  status?: string;
  priority?: string;
  season?: string[];
  notes?: string;
  generationCost?: number;
  images?: string[];
  coverImageUrl?: string;
  createdAt?: string;
  fields: Record<string, any>;
}

export interface EtsyImage {
  id: string;
  name: string;
  url?: string;
  thumbnailUrl?: string;
  productId?: string;
  prompt?: string;
  generationStatus?: string;
  modelUsed?: string;
  replicateId?: string;
  cost?: number;
  createdAt?: string;
  fields: Record<string, any>;
}

export interface EtsyListing {
  id: string;
  title: string;
  description?: string;
  price?: number;
  quantity?: number;
  status?: string;
  productId?: string;
  etsyUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  fields: Record<string, any>;
}

export class EtsyService {
  private env: Env;
  private readonly CACHE_PREFIX = 'etsy:';
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Check if Etsy Airtable is configured
   */
  isConfigured(): boolean {
    return Boolean(this.env.AIRTABLE_API_KEY);
  }

  /**
   * Make authenticated request to Airtable API for Etsy base
   */
  private async airtableFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.env.AIRTABLE_API_KEY) {
      throw new Error('Airtable API key not configured');
    }

    const url = `${AIRTABLE_API_BASE}/${ETSY_BASE_ID}/${endpoint}`;

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
      console.error(`[Etsy] API error: ${response.status}`, error);
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
        console.log(`[Etsy] Cache hit: ${key}`);
        return cached as T;
      }
      return null;
    } catch (error) {
      console.error(`[Etsy] Cache read error for ${key}:`, error);
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
      console.error(`[Etsy] Cache write error for ${key}:`, error);
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
      console.error(`[Etsy] Cache invalidation error:`, error);
    }
  }

  // ============================================
  // PRODUCTS
  // ============================================

  /**
   * List all products
   */
  async listProducts(useCache = true): Promise<EtsyProduct[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}products:all`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyProduct[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Etsy] Fetching products');
      const result = await this.airtableFetch(ETSY_TABLES.products);

      const products: EtsyProduct[] = (result.records || []).map((r: any) => {
        // Extract CoverImage URL from Airtable attachment
        const coverImage = r.fields.CoverImage?.[0];
        const coverImageUrl = coverImage?.url || coverImage?.thumbnails?.large?.url;

        return {
          id: r.id,
          name: r.fields.Name || '',
          niche: r.fields.Niche,
          style: r.fields.Style,
          productType: r.fields['Product Type'],
          quantity: r.fields.Quantity,
          status: r.fields.Status,
          priority: r.fields.Priority,
          season: r.fields.Season,
          notes: r.fields.Notes,
          generationCost: r.fields['Generation Cost'],
          images: r.fields.Images,
          coverImageUrl,
          createdAt: r.createdTime,
          fields: r.fields
        };
      });

      await this.setCache(cacheKey, products);
      console.log(`[Etsy] Fetched ${products.length} products`);
      return products;
    } catch (error: any) {
      console.error('[Etsy] Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Get single product
   */
  async getProduct(productId: string, useCache = true): Promise<EtsyProduct | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}products:${productId}`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyProduct>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Etsy] Fetching product ${productId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.products}/${productId}`);

      // Extract CoverImage URL from Airtable attachment
      const coverImage = result.fields.CoverImage?.[0];
      const coverImageUrl = coverImage?.url || coverImage?.thumbnails?.large?.url;

      const product: EtsyProduct = {
        id: result.id,
        name: result.fields.Name || '',
        niche: result.fields.Niche,
        style: result.fields.Style,
        productType: result.fields['Product Type'],
        quantity: result.fields.Quantity,
        status: result.fields.Status,
        priority: result.fields.Priority,
        season: result.fields.Season,
        notes: result.fields.Notes,
        generationCost: result.fields['Generation Cost'],
        images: result.fields.Images,
        coverImageUrl,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, product);
      return product;
    } catch (error: any) {
      console.error(`[Etsy] Error fetching product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, fields: Record<string, any>): Promise<EtsyProduct | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Etsy] Updating product ${productId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.products}/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('products', productId);

      // Extract CoverImage URL from Airtable attachment
      const coverImage = result.fields.CoverImage?.[0];
      const coverImageUrl = coverImage?.url || coverImage?.thumbnails?.large?.url;

      return {
        id: result.id,
        name: result.fields.Name || '',
        niche: result.fields.Niche,
        style: result.fields.Style,
        productType: result.fields['Product Type'],
        quantity: result.fields.Quantity,
        status: result.fields.Status,
        priority: result.fields.Priority,
        season: result.fields.Season,
        notes: result.fields.Notes,
        generationCost: result.fields['Generation Cost'],
        images: result.fields.Images,
        coverImageUrl,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Etsy] Error updating product ${productId}:`, error);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  // ============================================
  // IMAGES
  // ============================================

  /**
   * List all images with pagination support
   */
  async listImages(useCache = true): Promise<EtsyImage[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}images:all`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyImage[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Etsy] Fetching images with pagination');
      const allImages: EtsyImage[] = [];
      let offset: string | undefined;

      do {
        const url = offset ? `${ETSY_TABLES.images}?offset=${offset}` : ETSY_TABLES.images;
        const result = await this.airtableFetch(url);

        const images: EtsyImage[] = (result.records || []).map((r: any) => {
          // Get image URL from ImageUrl field or Image File attachment
          const imageFile = r.fields['Image File']?.[0];
          const imgUrl = r.fields.ImageUrl || imageFile?.url;
          const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || imgUrl;

          return {
            id: r.id,
            name: r.fields.Name || '',
            url: imgUrl,
            thumbnailUrl,
            productId: r.fields.Product?.[0],
            prompt: r.fields.Prompt,
            generationStatus: r.fields['Generation Status'],
            modelUsed: r.fields['Model Used'],
            replicateId: r.fields['Replicate ID'],
            cost: r.fields.Cost,
            createdAt: r.createdTime,
            fields: r.fields
          };
        });

        allImages.push(...images);
        offset = result.offset;
        console.log(`[Etsy] Fetched ${images.length} images (total: ${allImages.length}), offset: ${offset || 'none'}`);
      } while (offset);

      await this.setCache(cacheKey, allImages);
      console.log(`[Etsy] Total images fetched: ${allImages.length}`);
      return allImages;
    } catch (error: any) {
      console.error('[Etsy] Error fetching images:', error);
      throw new Error(`Failed to fetch images: ${error.message}`);
    }
  }

  /**
   * Get images for a specific product
   */
  async getProductImages(productId: string, useCache = true): Promise<EtsyImage[]> {
    const allImages = await this.listImages(useCache);
    return allImages.filter(img => img.productId === productId);
  }

  /**
   * Get listings for a specific product
   */
  async getProductListings(productId: string, useCache = true): Promise<EtsyListing[]> {
    const allListings = await this.listListings(useCache);
    return allListings.filter(listing => listing.productId === productId);
  }

  /**
   * Get single image
   */
  async getImage(imageId: string, useCache = true): Promise<EtsyImage | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}images:${imageId}`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyImage>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Etsy] Fetching image ${imageId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.images}/${imageId}`);

      // Get image URL from ImageUrl field or Image File attachment
      const imageFile = result.fields['Image File']?.[0];
      const url = result.fields.ImageUrl || imageFile?.url;
      const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || url;

      const image: EtsyImage = {
        id: result.id,
        name: result.fields.Name || '',
        url,
        thumbnailUrl,
        productId: result.fields.Product?.[0],
        prompt: result.fields.Prompt,
        generationStatus: result.fields['Generation Status'],
        modelUsed: result.fields['Model Used'],
        replicateId: result.fields['Replicate ID'],
        cost: result.fields.Cost,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, image);
      return image;
    } catch (error: any) {
      console.error(`[Etsy] Error fetching image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Update image
   */
  async updateImage(imageId: string, fields: Record<string, any>): Promise<EtsyImage | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Etsy] Updating image ${imageId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.images}/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('images', imageId);

      // Get image URL from ImageUrl field or Image File attachment
      const imageFile = result.fields['Image File']?.[0];
      const url = result.fields.ImageUrl || imageFile?.url;
      const thumbnailUrl = imageFile?.thumbnails?.large?.url || imageFile?.thumbnails?.small?.url || url;

      return {
        id: result.id,
        name: result.fields.Name || '',
        url,
        thumbnailUrl,
        productId: result.fields.Product?.[0],
        prompt: result.fields.Prompt,
        generationStatus: result.fields['Generation Status'],
        modelUsed: result.fields['Model Used'],
        replicateId: result.fields['Replicate ID'],
        cost: result.fields.Cost,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Etsy] Error updating image ${imageId}:`, error);
      throw new Error(`Failed to update image: ${error.message}`);
    }
  }

  // ============================================
  // LISTINGS
  // ============================================

  /**
   * List all listings
   */
  async listListings(useCache = true): Promise<EtsyListing[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `${this.CACHE_PREFIX}listings:all`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyListing[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Etsy] Fetching listings');
      const result = await this.airtableFetch(ETSY_TABLES.listings);

      const listings: EtsyListing[] = (result.records || []).map((r: any) => ({
        id: r.id,
        title: r.fields.Title || r.fields.title || r.fields.Name || '',
        description: r.fields.Description || r.fields.description,
        price: r.fields.Price || r.fields.price,
        quantity: r.fields.Quantity || r.fields.quantity,
        status: r.fields.Status || r.fields.status,
        productId: r.fields.Product?.[0] || r.fields.ProductId,
        etsyUrl: r.fields['Etsy URL'] || r.fields.EtsyUrl || r.fields.etsyUrl,
        createdAt: r.createdTime,
        fields: r.fields
      }));

      await this.setCache(cacheKey, listings);
      console.log(`[Etsy] Fetched ${listings.length} listings`);
      return listings;
    } catch (error: any) {
      console.error('[Etsy] Error fetching listings:', error);
      throw new Error(`Failed to fetch listings: ${error.message}`);
    }
  }

  /**
   * Get single listing
   */
  async getListing(listingId: string, useCache = true): Promise<EtsyListing | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = `${this.CACHE_PREFIX}listings:${listingId}`;

    if (useCache) {
      const cached = await this.getFromCache<EtsyListing>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Etsy] Fetching listing ${listingId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.listings}/${listingId}`);

      const listing: EtsyListing = {
        id: result.id,
        title: result.fields.Title || result.fields.title || result.fields.Name || '',
        description: result.fields.Description || result.fields.description,
        price: result.fields.Price || result.fields.price,
        quantity: result.fields.Quantity || result.fields.quantity,
        status: result.fields.Status || result.fields.status,
        productId: result.fields.Product?.[0] || result.fields.ProductId,
        etsyUrl: result.fields['Etsy URL'] || result.fields.EtsyUrl || result.fields.etsyUrl,
        createdAt: result.createdTime,
        fields: result.fields
      };

      await this.setCache(cacheKey, listing);
      return listing;
    } catch (error: any) {
      console.error(`[Etsy] Error fetching listing ${listingId}:`, error);
      return null;
    }
  }

  /**
   * Update listing
   */
  async updateListing(listingId: string, fields: Record<string, any>): Promise<EtsyListing | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Etsy] Updating listing ${listingId}`);
      const result = await this.airtableFetch(`${ETSY_TABLES.listings}/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('listings', listingId);

      return {
        id: result.id,
        title: result.fields.Title || result.fields.title || result.fields.Name || '',
        description: result.fields.Description || result.fields.description,
        price: result.fields.Price || result.fields.price,
        quantity: result.fields.Quantity || result.fields.quantity,
        status: result.fields.Status || result.fields.status,
        productId: result.fields.Product?.[0] || result.fields.ProductId,
        etsyUrl: result.fields['Etsy URL'] || result.fields.EtsyUrl || result.fields.etsyUrl,
        createdAt: result.createdTime,
        fields: result.fields
      };
    } catch (error: any) {
      console.error(`[Etsy] Error updating listing ${listingId}:`, error);
      throw new Error(`Failed to update listing: ${error.message}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================

  /**
   * Get Etsy dashboard summary
   */
  async getSummary(useCache = true): Promise<{
    products: number;
    images: number;
    listings: number;
    activeListings: number;
  }> {
    const [products, images, listings] = await Promise.all([
      this.listProducts(useCache),
      this.listImages(useCache),
      this.listListings(useCache)
    ]);

    return {
      products: products.length,
      images: images.length,
      listings: listings.length,
      activeListings: listings.filter(l => l.status?.toLowerCase() === 'active').length
    };
  }
}
