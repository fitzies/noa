import { NextRequest, NextResponse } from 'next/server';
import { generateAndPostTweet } from '@/lib/functions';
import { fetchMetalPrices, writeMetalPricesCache } from '@/lib/metal-prices';
import { fetchRelevantNews } from '@/lib/news';

/**
 * POST handler - Generates and posts a tweet from relevant precious metals news
 * Also fetches and caches metal prices (Gold and Silver)
 * This endpoint can be called by cron jobs or scheduled tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Fetch and cache metal prices
    let metalPricesResult = null;
    let metalPrices = null;
    try {
      metalPrices = await fetchMetalPrices();
      writeMetalPricesCache(metalPrices);
      metalPricesResult = {
        success: true,
        lastUpdated: metalPrices.lastUpdated,
        prices: metalPrices.prices,
      };
    } catch (metalError) {
      console.error('Error fetching metal prices:', metalError);
      metalPricesResult = {
        success: false,
        error: metalError instanceof Error ? metalError.message : 'Unknown error',
      };
    }

    // Fetch relevant precious metals news
    let newsResult = null;
    let newsData = null;
    try {
      const relevantNews = await fetchRelevantNews();
      
      if (relevantNews && relevantNews.length > 0) {
        // Use the first (most relevant) article
        const article = relevantNews[0];
        newsData = {
          title: article.title,
          content: article.content || article.description || '',
          source: article.source_id || 'News',
          publishedAt: article.pubDate,
          link: article.link,
          category: 'Market/Crypto',
          metalPrices: metalPrices ? {
            gold: metalPrices.prices.XAU,
            silver: metalPrices.prices.XAG,
            lastUpdated: metalPrices.lastUpdated,
          } : null,
        };
        newsResult = {
          success: true,
          articlesFound: relevantNews.length,
          articleTitle: article.title,
        };
      } else {
        newsResult = {
          success: false,
          message: 'No relevant precious metals news found',
        };
      }
    } catch (newsError) {
      console.error('Error fetching news:', newsError);
      newsResult = {
        success: false,
        error: newsError instanceof Error ? newsError.message : 'Unknown error',
      };
    }

    // Always generate and post tweet (with news if available, or just metal prices)
    let tweetResult = null;
    try {
      // Prepare data object - always include metal prices, add news if available
      const tweetData = newsData || {
        metalPrices: metalPrices ? {
          gold: metalPrices.prices.XAU,
          silver: metalPrices.prices.XAG,
          lastUpdated: metalPrices.lastUpdated,
        } : null,
      };

      const postResponse = await generateAndPostTweet(tweetData);
      tweetResult = {
        success: true,
        tweetId: postResponse.data?.id,
        tweetText: postResponse.data?.text,
      };
    } catch (tweetError) {
      console.error('Error generating/posting tweet:', tweetError);
      tweetResult = {
        success: false,
        error: tweetError instanceof Error ? tweetError.message : 'Unknown error',
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      tweet: tweetResult,
      metalPrices: metalPricesResult,
      news: newsResult,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute cron job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
