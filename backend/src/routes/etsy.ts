/**
 * Etsy Routes - API endpoints for Etsy product/listing management
 * Connects to Etsy Airtable base for product data
 */

import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types';
import { EtsyService, EtsyProduct, EtsyImage, EtsyListing } from '../services/etsy';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/etsy/summary
 * Get Etsy dashboard summary stats
 */
app.get('/summary', async (c) => {
  try {
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    if (!etsy.isConfigured()) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Etsy Airtable not configured',
        message: 'Missing Airtable API key'
      }, 500);
    }

    const summary = await etsy.getSummary(!noCache);

    return c.json<ApiResponse>({
      success: true,
      data: summary
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error getting summary:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to get summary'
    }, 500);
  }
});

// ============================================
// PRODUCTS
// ============================================

/**
 * GET /api/etsy/products
 * List all products
 */
app.get('/products', async (c) => {
  try {
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const products = await etsy.listProducts(!noCache);

    return c.json<ApiResponse<EtsyProduct[]>>({
      success: true,
      data: products,
      message: `Retrieved ${products.length} products`
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error listing products:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list products'
    }, 500);
  }
});

/**
 * GET /api/etsy/products/:id
 * Get single product with its images and listings
 */
app.get('/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const product = await etsy.getProduct(productId, !noCache);

    if (!product) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Product ${productId} not found`
      }, 404);
    }

    // Get images and listings for this product in parallel
    const [images, listings] = await Promise.all([
      etsy.getProductImages(productId, !noCache),
      etsy.getProductListings(productId, !noCache)
    ]);

    return c.json<ApiResponse>({
      success: true,
      data: {
        ...product,
        productImages: images,
        productListings: listings
      }
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error fetching product:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch product'
    }, 500);
  }
});

/**
 * PATCH /api/etsy/products/:id
 * Update product fields
 */
app.patch('/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const updates = await c.req.json();
    const etsy = new EtsyService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const product = await etsy.updateProduct(productId, updates);

    if (!product) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update product ${productId}`
      }, 500);
    }

    return c.json<ApiResponse<EtsyProduct>>({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error updating product:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update product'
    }, 500);
  }
});

// ============================================
// IMAGES
// ============================================

/**
 * GET /api/etsy/images
 * List all images
 */
app.get('/images', async (c) => {
  try {
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const images = await etsy.listImages(!noCache);

    return c.json<ApiResponse<EtsyImage[]>>({
      success: true,
      data: images,
      message: `Retrieved ${images.length} images`
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error listing images:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list images'
    }, 500);
  }
});

/**
 * GET /api/etsy/images/:id
 * Get single image
 */
app.get('/images/:id', async (c) => {
  try {
    const imageId = c.req.param('id');
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const image = await etsy.getImage(imageId, !noCache);

    if (!image) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Image ${imageId} not found`
      }, 404);
    }

    return c.json<ApiResponse<EtsyImage>>({
      success: true,
      data: image
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error fetching image:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch image'
    }, 500);
  }
});

/**
 * PATCH /api/etsy/images/:id
 * Update image fields
 */
app.patch('/images/:id', async (c) => {
  try {
    const imageId = c.req.param('id');
    const updates = await c.req.json();
    const etsy = new EtsyService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const image = await etsy.updateImage(imageId, updates);

    if (!image) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update image ${imageId}`
      }, 500);
    }

    return c.json<ApiResponse<EtsyImage>>({
      success: true,
      data: image,
      message: 'Image updated successfully'
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error updating image:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update image'
    }, 500);
  }
});

// ============================================
// LISTINGS
// ============================================

/**
 * GET /api/etsy/listings
 * List all listings
 */
app.get('/listings', async (c) => {
  try {
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const listings = await etsy.listListings(!noCache);

    return c.json<ApiResponse<EtsyListing[]>>({
      success: true,
      data: listings,
      message: `Retrieved ${listings.length} listings`
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error listing listings:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list listings'
    }, 500);
  }
});

/**
 * GET /api/etsy/listings/:id
 * Get single listing with related product info
 */
app.get('/listings/:id', async (c) => {
  try {
    const listingId = c.req.param('id');
    const etsy = new EtsyService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const listing = await etsy.getListing(listingId, !noCache);

    if (!listing) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Listing ${listingId} not found`
      }, 404);
    }

    // Get related product if productId exists
    let relatedProduct = null;
    if (listing.productId) {
      relatedProduct = await etsy.getProduct(listing.productId, !noCache);
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        ...listing,
        relatedProduct
      }
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error fetching listing:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch listing'
    }, 500);
  }
});

/**
 * PATCH /api/etsy/listings/:id
 * Update listing fields
 */
app.patch('/listings/:id', async (c) => {
  try {
    const listingId = c.req.param('id');
    const updates = await c.req.json();
    const etsy = new EtsyService(c.env);

    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const listing = await etsy.updateListing(listingId, updates);

    if (!listing) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update listing ${listingId}`
      }, 500);
    }

    return c.json<ApiResponse<EtsyListing>>({
      success: true,
      data: listing,
      message: 'Listing updated successfully'
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error updating listing:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update listing'
    }, 500);
  }
});

/**
 * POST /api/etsy/cache/invalidate
 * Invalidate all Etsy caches
 */
app.post('/cache/invalidate', async (c) => {
  try {
    const etsy = new EtsyService(c.env);

    await Promise.all([
      etsy.invalidateCache('products'),
      etsy.invalidateCache('images'),
      etsy.invalidateCache('listings')
    ]);

    return c.json<ApiResponse>({
      success: true,
      message: 'Etsy cache invalidated'
    });
  } catch (err: any) {
    console.error('[Etsy Routes] Error invalidating cache:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to invalidate cache'
    }, 500);
  }
});

export default app;
