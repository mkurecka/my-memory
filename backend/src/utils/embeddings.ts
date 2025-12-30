/**
 * Embeddings utility for semantic search
 * Uses Cloudflare Workers AI for embedding generation
 * Uses Cloudflare Vectorize for vector storage and search
 */

import type { Env } from '../types';

// Embedding model configuration
export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
export const EMBEDDING_DIMENSIONS = 768;

// Workers AI embedding response type
interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

/**
 * Generate embeddings for text using Cloudflare Workers AI
 * Uses bge-base-en-v1.5 model (768 dimensions, FREE with Workers AI)
 */
export async function generateEmbedding(env: Env, text: string): Promise<number[] | null> {
  try {
    if (!text || text.trim().length === 0) {
      return null;
    }

    if (!env.AI) {
      console.error('[Embeddings] AI binding not available');
      return null;
    }

    // Truncate text to max 8000 characters to stay within token limits
    const truncatedText = text.substring(0, 8000);

    const result = await env.AI.run(EMBEDDING_MODEL, {
      text: [truncatedText]
    }) as EmbeddingResponse;

    if (result && result.data && result.data[0]) {
      return result.data[0];
    }

    return null;
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(env: Env, texts: string[]): Promise<(number[] | null)[]> {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (!env.AI) {
      console.error('[Embeddings] AI binding not available');
      return texts.map(() => null);
    }

    // Truncate and filter texts
    const truncatedTexts = texts
      .map(t => t?.substring(0, 8000) || '')
      .filter(t => t.trim().length > 0);

    if (truncatedTexts.length === 0) {
      return texts.map(() => null);
    }

    const result = await env.AI.run(EMBEDDING_MODEL, {
      text: truncatedTexts
    }) as EmbeddingResponse;

    if (result && result.data) {
      return result.data;
    }

    return texts.map(() => null);
  } catch (error) {
    console.error('[Embeddings] Error generating batch embeddings:', error);
    return texts.map(() => null);
  }
}

/**
 * Insert a vector into Vectorize index
 */
export async function insertVector(
  env: Env,
  id: string,
  embedding: number[],
  metadata: Record<string, string>
): Promise<boolean> {
  try {
    if (!env.VECTORIZE) {
      console.error('[Embeddings] Vectorize binding not available');
      return false;
    }

    await env.VECTORIZE.insert([{
      id,
      values: embedding,
      metadata
    }]);

    return true;
  } catch (error) {
    console.error('[Embeddings] Error inserting vector:', error);
    return false;
  }
}

/**
 * Delete a vector from Vectorize index
 */
export async function deleteVector(env: Env, id: string): Promise<boolean> {
  try {
    if (!env.VECTORIZE) {
      console.error('[Embeddings] Vectorize binding not available');
      return false;
    }

    await env.VECTORIZE.deleteByIds([id]);
    return true;
  } catch (error) {
    console.error('[Embeddings] Error deleting vector:', error);
    return false;
  }
}

/**
 * Search for similar vectors using Vectorize
 */
export async function vectorSearch(
  env: Env,
  queryEmbedding: number[],
  userId: string,
  options: {
    topK?: number;
    minScore?: number;
    table?: 'posts' | 'memory';
  } = {}
): Promise<VectorizeMatch[]> {
  try {
    if (!env.VECTORIZE) {
      console.error('[Embeddings] Vectorize binding not available');
      return [];
    }

    const { topK = 10, minScore = 0.7, table } = options;

    // Build filter for user_id and optional table
    const filter: Record<string, string> = { user_id: userId };
    if (table) {
      filter.table = table;
    }

    const results = await env.VECTORIZE.query(queryEmbedding, {
      topK,
      filter,
      returnMetadata: 'all'
    });

    // Filter by minimum score
    return results.matches.filter(match => match.score >= minScore);
  } catch (error) {
    console.error('[Embeddings] Vector search error:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors (legacy, for D1-based search)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract keywords from text for basic search fallback
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Remove common words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Get unique words
  return [...new Set(words)].slice(0, 20);
}

/**
 * Legacy: Search for similar content using D1 embeddings
 * @deprecated Use vectorSearch with Vectorize instead
 */
export async function semanticSearchLegacy(
  env: Env,
  queryEmbedding: number[],
  table: 'posts' | 'memory',
  userId: string,
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<any[]> {
  try {
    // Get all records with embeddings
    const query = table === 'posts'
      ? env.DB.prepare(`
          SELECT id, type, original_text, generated_output, embedding_vector, search_keywords, created_at
          FROM posts
          WHERE user_id = ? AND embedding_vector IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 100
        `).bind(userId)
      : env.DB.prepare(`
          SELECT id, text, context_json, embedding_vector, search_keywords, created_at, tags
          FROM memory
          WHERE user_id = ? AND embedding_vector IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 100
        `).bind(userId);

    const results = await query.all();

    if (!results.results || results.results.length === 0) {
      return [];
    }

    // Calculate similarities
    const scored = results.results.map((row: any) => {
      const embedding = JSON.parse(row.embedding_vector);
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return { ...row, similarity };
    });

    // Filter by minimum similarity and sort
    return scored
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

  } catch (error) {
    console.error('[Embeddings] Search error:', error);
    return [];
  }
}
