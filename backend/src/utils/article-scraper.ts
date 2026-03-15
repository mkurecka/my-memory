/**
 * Scrape full article content from a URL using DumplingAI API
 */
export async function scrapeArticleContent(apiKey: string, url: string): Promise<string | null> {
  try {
    const response = await fetch('https://app.dumplingai.com/api/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url,
        format: 'markdown',
        renderJs: true,
        cleaned: true
      })
    });

    if (!response.ok) {
      console.error('[ArticleScraper] DumplingAI returned status:', response.status);
      return null;
    }

    const data = await response.json() as { content?: string; title?: string };
    return data?.content || null;
  } catch (error) {
    console.error('[ArticleScraper] Error scraping article:', error);
    return null;
  }
}
