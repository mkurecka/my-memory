/**
 * Shared helper utilities
 */

import type { Env } from '../types';
import type { Context } from 'hono';

/**
 * Simple hash function for deduplication
 * Converts a string to a short base36 hash
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Ensure user exists in database (create guest user if needed)
 * Creates a placeholder user for extension/mobile saves
 */
export async function ensureUserExists(c: Context<{ Bindings: Env }>, userId: string): Promise<void> {
  try {
    // Check if user exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      // Create guest user (no email/password, just for data storage)
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, created_at, subscription_tier)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        userId,
        `guest_${userId}@extension.local`, // Placeholder email
        'guest', // Placeholder password hash
        Date.now(),
        'free'
      ).run();

      console.log('[Helpers] Created guest user:', userId);
    }
  } catch (error) {
    console.error('[Helpers] Error ensuring user exists:', error);
    throw error; // Re-throw to prevent saving data without user
  }
}
