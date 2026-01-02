/**
 * AI-powered memory analyzer
 * Categorizes memories and suggests actionable next steps
 */

import type { Env } from '../types';

export interface MemoryAnalysis {
  // Primary category
  category: 'business' | 'personal' | 'tech' | 'content' | 'learning' | 'idea' | 'inspiration' | 'reference';

  // Subcategories/topics
  topics: string[];

  // Content type detection
  contentType: 'article' | 'tweet' | 'video' | 'tool' | 'quote' | 'note' | 'tutorial' | 'news' | 'research';

  // Suggested actions with reasoning
  suggestedActions: SuggestedAction[];

  // Relevant platforms/accounts
  relevantPlatforms: Platform[];

  // Business relevance
  businessRelevance: {
    score: number; // 0-100
    areas: string[]; // e.g., ["etsy", "saas", "marketing"]
  };

  // Content potential
  contentPotential: {
    twitter: ContentPotential;
    linkedin: ContentPotential;
    instagram: ContentPotential;
    youtube: ContentPotential;
    tiktok: ContentPotential;
    article: ContentPotential;
  };

  // Key takeaways (for quick reference)
  keyTakeaways: string[];

  // Suggested tags
  suggestedTags: string[];

  // Priority for action
  actionPriority: 'high' | 'medium' | 'low';

  // Sentiment
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';

  // Language detected
  language: string;

  // Estimated read/watch time if applicable
  estimatedTime?: string;

  // Analysis timestamp
  analyzedAt: number;
}

export interface SuggestedAction {
  type: 'twitter_thread' | 'twitter_post' | 'linkedin_post' | 'linkedin_article' |
        'instagram_post' | 'instagram_carousel' | 'instagram_reel' |
        'youtube_video' | 'youtube_short' | 'tiktok' |
        'blog_article' | 'newsletter' | 'implement' | 'research_more' |
        'share_team' | 'save_reference' | 'create_product' | 'etsy_listing';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAngle?: string;
}

export interface Platform {
  name: string;
  relevance: number; // 0-100
  suggestedAccount?: string;
}

export interface ContentPotential {
  score: number; // 0-100
  format?: string; // e.g., "thread", "carousel", "long-form"
  angle?: string; // suggested angle/hook
}

const ANALYSIS_PROMPT = `You are a content strategist and business analyst. Analyze this saved memory/content and provide actionable insights.

CONTENT TO ANALYZE:
"""
{content}
"""

{contextInfo}

Respond with a JSON object (no markdown, just raw JSON):
{
  "category": "business|personal|tech|content|learning|idea|inspiration|reference",
  "topics": ["topic1", "topic2", ...],
  "contentType": "article|tweet|video|tool|quote|note|tutorial|news|research",
  "suggestedActions": [
    {
      "type": "twitter_thread|twitter_post|linkedin_post|linkedin_article|instagram_post|instagram_carousel|instagram_reel|youtube_video|youtube_short|tiktok|blog_article|newsletter|implement|research_more|share_team|save_reference|create_product|etsy_listing",
      "reason": "Why this action makes sense",
      "priority": "high|medium|low",
      "suggestedAngle": "Optional hook or angle for content"
    }
  ],
  "relevantPlatforms": [
    {"name": "Twitter", "relevance": 85, "suggestedAccount": "optional_account"},
    {"name": "LinkedIn", "relevance": 70}
  ],
  "businessRelevance": {
    "score": 0-100,
    "areas": ["etsy", "saas", "ai", "marketing", "ecommerce", "consulting", ...]
  },
  "contentPotential": {
    "twitter": {"score": 0-100, "format": "thread|single|quote", "angle": "hook idea"},
    "linkedin": {"score": 0-100, "format": "post|article|carousel", "angle": "hook idea"},
    "instagram": {"score": 0-100, "format": "carousel|reel|story|post", "angle": "hook idea"},
    "youtube": {"score": 0-100, "format": "video|short", "angle": "hook idea"},
    "tiktok": {"score": 0-100, "format": "trend|tutorial|story", "angle": "hook idea"},
    "article": {"score": 0-100, "format": "blog|newsletter|guide", "angle": "hook idea"}
  },
  "keyTakeaways": ["Key point 1", "Key point 2", ...],
  "suggestedTags": ["tag1", "tag2", ...],
  "actionPriority": "high|medium|low",
  "sentiment": "positive|neutral|negative|mixed",
  "language": "en|cs|de|...",
  "estimatedTime": "5 min read" (optional)
}

Consider:
- Is this actionable for content creation?
- Which platforms would this resonate best on?
- Is there a business opportunity here?
- What's the unique angle or hook?
- Be specific with suggested actions`;

/**
 * Analyze a memory using AI
 */
export async function analyzeMemory(
  env: Env,
  text: string,
  existingContext?: Record<string, any>
): Promise<MemoryAnalysis | null> {
  try {
    // Get API key from env variable first, then fall back to KV settings
    let apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      const settingsJson = await env.CACHE.get('app:settings');
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      apiKey = settings.openrouterApiKey;
    }

    if (!apiKey) {
      console.log('[MemoryAnalyzer] No OpenRouter API key configured');
      return null;
    }

    // Build context info
    let contextInfo = '';
    if (existingContext) {
      if (existingContext.title) contextInfo += `Title: ${existingContext.title}\n`;
      if (existingContext.description) contextInfo += `Description: ${existingContext.description}\n`;
      if (existingContext.author) contextInfo += `Author: ${existingContext.author}\n`;
      if (existingContext.url) contextInfo += `URL: ${existingContext.url}\n`;
    }

    const prompt = ANALYSIS_PROMPT
      .replace('{content}', text.substring(0, 4000)) // Limit content size
      .replace('{contextInfo}', contextInfo ? `ADDITIONAL CONTEXT:\n${contextInfo}` : '');

    // Call OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://my-memory.kureckamichal.workers.dev',
        'X-Title': 'My Memory Analyzer'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error('[MemoryAnalyzer] OpenRouter error:', response.status);
      return null;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[MemoryAnalyzer] No content in response');
      return null;
    }

    // Parse JSON response
    const analysis = JSON.parse(content) as MemoryAnalysis;
    analysis.analyzedAt = Date.now();

    console.log('[MemoryAnalyzer] Analysis complete:', {
      category: analysis.category,
      topics: analysis.topics?.slice(0, 3),
      actionsCount: analysis.suggestedActions?.length
    });

    return analysis;

  } catch (error: any) {
    console.error('[MemoryAnalyzer] Error:', error.message);
    return null;
  }
}

/**
 * Get a quick summary of analysis for display
 */
export function getAnalysisSummary(analysis: MemoryAnalysis): string {
  const topAction = analysis.suggestedActions?.[0];
  const topPlatform = analysis.relevantPlatforms?.[0];

  let summary = `${analysis.category} | `;
  summary += `${analysis.topics?.slice(0, 2).join(', ')} | `;

  if (topAction) {
    summary += `→ ${topAction.type.replace(/_/g, ' ')}`;
  }

  return summary;
}
