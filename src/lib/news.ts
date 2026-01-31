import { initializeGPT } from './gpt';

interface NewsArticle {
  article_id?: string;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate: string;
  source_id?: string;
  creator?: string[];
  image_url?: string;
  video_url?: string;
  keywords?: string[];
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsArticle[];
  nextPage?: string;
}

/**
 * Fetches crypto news from NewsData.io API
 * @returns Promise resolving to array of news articles
 */
export async function fetchCryptoNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_DATA_API;
  
  if (!apiKey) {
    throw new Error('NEWS_DATA_API environment variable is not set');
  }

  try {
    const url = `https://newsdata.io/api/1/crypto?apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}`);
    }

    const data: NewsDataResponse = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io API returned error status: ${data.status}`);
    }

    return data.results || [];
  } catch (error) {
    console.error('Error fetching crypto news:', error);
    throw error;
  }
}

/**
 * Fetches market and financial news from NewsData.io API
 * @returns Promise resolving to array of news articles
 */
export async function fetchMarketNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_DATA_API;
  
  if (!apiKey) {
    throw new Error('NEWS_DATA_API environment variable is not set');
  }

  try {
    // Fetch market news with keywords related to economics and markets
    // Use URLSearchParams to properly encode the query string
    // Note: category should be a single value, not comma-separated
    const params = new URLSearchParams({
      apikey: apiKey,
      category: 'business',
      q: 'market economy inflation fed interest currency',
    });
    const url = `https://newsdata.io/api/1/latest?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.message || JSON.stringify(errorData);
      } catch {
        errorDetails = response.statusText;
      }
      throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
    }

    const data: NewsDataResponse = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`NewsData.io API returned error status: ${data.status}`);
    }

    return data.results || [];
  } catch (error) {
    console.error('Error fetching market news:', error);
    throw error;
  }
}

/**
 * Uses GPT to analyze if a news article is relevant to precious metals
 * @param article - News article to analyze
 * @returns Promise resolving to boolean indicating relevance, or null if cannot be matched
 */
export async function isRelevantToPreciousMetals(article: NewsArticle): Promise<boolean | null> {
  const client = initializeGPT();

  const articleContent = `
Title: ${article.title}
Description: ${article.description || 'N/A'}
Content: ${article.content ? article.content.substring(0, 500) : 'N/A'}
Keywords: ${article.keywords?.join(', ') || 'N/A'}
`;

  const prompt = `You are analyzing a news article to determine if it is relevant to precious metals (gold, silver, platinum, palladium) for a precious metals tweet bot.

The article should be relevant if it:
- Directly mentions precious metals (gold, silver, platinum, palladium)
- Discusses topics that affect precious metals markets (inflation, economic uncertainty, market volatility, currency devaluation, safe haven assets, Federal Reserve policy, interest rates, economic indicators)
- Can be meaningfully connected to precious metals investment or market trends

Article to analyze:
${articleContent}

Respond with ONLY one word: "YES" if the article is relevant and can be connected to precious metals, "NO" if it is not relevant, or "NULL" if you cannot determine or the connection would be too forced/artificial.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-5.2',
      input: prompt,
    });

    const result = (response.output_text || '').trim().toUpperCase();
    
    if (result === 'YES') {
      return true;
    } else if (result === 'NO') {
      return false;
    } else {
      return null; // Cannot be matched or too forced
    }
  } catch (error) {
    console.error('Error analyzing article relevance:', error);
    // On error, return null to be safe
    return null;
  }
}

/**
 * Fetches crypto and market news, filters for precious metals relevance, and returns top relevant articles
 * @returns Promise resolving to array of relevant news articles (1-3 articles), or null if none found
 */
export async function fetchRelevantNews(): Promise<NewsArticle[] | null> {
  try {
    // Fetch both crypto and market news in parallel
    const [cryptoNews, marketNews] = await Promise.all([
      fetchCryptoNews().catch(err => {
        console.error('Failed to fetch crypto news:', err);
        return [];
      }),
      fetchMarketNews().catch(err => {
        console.error('Failed to fetch market news:', err);
        return [];
      }),
    ]);

    // Combine and limit to recent articles (first 10 from each)
    const allNews = [...cryptoNews.slice(0, 10), ...marketNews.slice(0, 10)];

    if (allNews.length === 0) {
      console.log('No news articles fetched');
      return null;
    }

    // Filter articles for precious metals relevance
    const relevantArticles: NewsArticle[] = [];
    
    // Process articles sequentially to avoid overwhelming GPT API
    for (const article of allNews) {
      if (relevantArticles.length >= 3) {
        break; // We have enough relevant articles
      }

      const isRelevant = await isRelevantToPreciousMetals(article);
      
      if (isRelevant === true) {
        relevantArticles.push(article);
      }
      // Skip if false or null (not relevant or cannot be matched)
    }

    if (relevantArticles.length === 0) {
      console.log('No relevant precious metals news found');
      return null;
    }

    return relevantArticles;
  } catch (error) {
    console.error('Error fetching relevant news:', error);
    return null;
  }
}
