/**
 * API client for My Memory backend
 */

interface Memory {
  id: string;
  user_id: string;
  text: string;
  context_json: string | null;
  tag: string | null;
  priority: string | null;
  created_at: number;
}

interface SearchResult extends Memory {
  similarity?: number;
}

interface SaveMemoryResult {
  success: boolean;
  memoryId: string;
  type: string | null;
  enriched: boolean;
  message: string;
}

interface ListOptions {
  limit?: number;
  offset?: number;
  tag?: string;
}

interface SearchOptions {
  limit?: number;
  tag?: string;
}

interface SaveOptions {
  tag?: string;
  context?: Record<string, unknown>;
}

export class MemoryClient {
  private apiUrl: string;
  private token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error || errorJson.message || response.statusText;
      } catch {
        errorMessage = errorBody || response.statusText;
      }
      throw new Error(`API error (${response.status}): ${errorMessage}`);
    }

    return response.json();
  }

  /**
   * Search memories using semantic search
   */
  async searchMemories(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, tag } = options;

    // First try semantic search
    const response = await this.request<{
      success: boolean;
      results: SearchResult[];
      count: number;
    }>("/api/search/semantic", {
      method: "POST",
      body: JSON.stringify({
        query,
        table: "memory",
        limit,
        minSimilarity: 0.5,
      }),
    });

    let results = response.results || [];

    // Filter by tag if specified
    if (tag && results.length > 0) {
      results = results.filter((r) => r.tag === tag);
    }

    return results;
  }

  /**
   * Save a new memory
   */
  async saveMemory(
    text: string,
    options: SaveOptions = {}
  ): Promise<SaveMemoryResult> {
    const { tag, context } = options;

    const response = await this.request<SaveMemoryResult>("/api/memory", {
      method: "POST",
      body: JSON.stringify({
        text,
        tag,
        context,
      }),
    });

    return response;
  }

  /**
   * List memories with optional filtering
   */
  async listMemories(options: ListOptions = {}): Promise<Memory[]> {
    const { limit = 20, offset = 0, tag } = options;

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (tag) params.set("tag", tag);

    const response = await this.request<{
      success: boolean;
      memories: Memory[];
      count: number;
    }>(`/api/memory?${params.toString()}`);

    return response.memories || [];
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<Memory> {
    const response = await this.request<{
      success: boolean;
      memory: Memory;
    }>(`/api/memory/${id}`);

    return response.memory;
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/memory/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Get list of available tags
   */
  async getTags(): Promise<string[]> {
    const response = await this.request<{
      success: boolean;
      tags: string[];
    }>("/api/memory/tags/list");

    return response.tags || [];
  }
}
