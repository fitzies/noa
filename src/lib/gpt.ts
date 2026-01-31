import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Initializes and returns an OpenAI client instance using the API key from environment variables.
 * 
 * @returns Configured OpenAI client instance
 * @throws Error if OPENAI_API_KEY is missing
 */
export function initializeGPT(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment variables');
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Reads bot settings from the JSON file.
 * 
 * @returns Bot settings object
 */
function getBotSettings() {
  try {
    const settingsPath = join(process.cwd(), 'data', 'bot-settings.json');
    const settingsData = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(settingsData);
  } catch (error) {
    // Return defaults if file doesn't exist or can't be read
    return {
      postFrequency: 30,
      tone: 'casual',
      personality: '',
    };
  }
}

/**
 * Generates tweet text from news data using OpenAI GPT.
 * 
 * @param data - News data object (flexible structure with properties like title, content, source, etc.)
 * @returns Promise resolving to generated tweet text (max 280 characters)
 * @throws Error if generation fails
 */
export async function generateTweetText(data: any): Promise<string> {
  const client = initializeGPT();
  const settings = getBotSettings();

  // Build the prompt with bot settings and news data
  const toneInstruction = settings.tone 
    ? `Write in a ${settings.tone} tone.` 
    : '';
  
  const personalityInstruction = settings.personality
    ? `Personality: ${settings.personality}`
    : '';

  // Check if we have news content or just metal prices
  const hasNews = data?.title || data?.content || data?.description;
  
  // Format news data into a readable string (if available)
  const newsContent = hasNews && typeof data === 'object' 
    ? JSON.stringify(data, null, 2)
    : '';

  // Extract metal prices if available
  const metalPricesInfo = data?.metalPrices 
    ? `\n\nCurrent Metal Prices (per troy oz):
- Gold (XAU): $${data.metalPrices.gold?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}
- Silver (XAG): $${data.metalPrices.silver?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}
Last updated: ${data.metalPrices.lastUpdated ? new Date(data.metalPrices.lastUpdated).toLocaleString('en-US', { timeZone: 'Asia/Singapore' }) : 'N/A'}`
    : '';

  // Build prompt based on whether we have news or just prices
  const prompt = hasNews
    ? `You are a social media bot for a precious metals (gold, silver, platinum, palladium) tweet account. You create engaging tweets from news content that is relevant to precious metals markets.

${toneInstruction}
${personalityInstruction}

IMPORTANT: This news has already been filtered for precious metals relevance. Your task is to create a tweet that connects the news to precious metals in a natural and engaging way. The news may directly mention precious metals, or it may discuss topics that affect precious metals markets (inflation, economic uncertainty, market volatility, currency movements, Federal Reserve policy, interest rates, etc.).

CRITICAL: You only have current price data. NEVER claim prices are at all-time highs (ATH) or all-time lows (ATL) as you do not have historical data to verify this.

News content:
${newsContent}${metalPricesInfo}

Generate a compelling tweet (maximum 280 characters) that:
1. Connects the news to precious metals markets in a meaningful way
2. Is engaging and relevant to precious metals investors/traders
3. ${data?.metalPrices ? 'May optionally incorporate the current metal prices (gold and silver) if it fits naturally' : 'Focuses on the news relevance to precious metals'}
4. Maintains the specified tone and personality
5. Does NOT force a connection if the news cannot be meaningfully related to precious metals (though this should be rare since news is pre-filtered)
6. NEVER claims prices are at ATH or ATL - you only have current prices, not historical data

Make it engaging, relevant, and appropriate for the specified tone and personality.`
    : `You are a social media bot for a precious metals (gold, silver, platinum, palladium) tweet account. You create engaging tweets about current precious metals prices.

${toneInstruction}
${personalityInstruction}

CRITICAL: You only have current price data. NEVER claim prices are at all-time highs (ATH) or all-time lows (ATL) as you do not have historical data to verify this.

${metalPricesInfo}

Generate a compelling tweet (maximum 280 characters) that:
1. Shares current precious metals prices in an engaging way
2. Is relevant and interesting to precious metals investors/traders
3. Incorporates the current metal prices (gold and silver)
4. Maintains the specified tone and personality
5. NEVER claims prices are at ATH or ATL - you only have current prices, not historical data
6. Focuses on the current market snapshot without making historical comparisons

Make it engaging, relevant, and appropriate for the specified tone and personality.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-5.2',
      input: prompt,
    });

    // Extract text from response
    const generatedText = response.output_text || '';
    
    // Ensure it's within 280 character limit
    const tweetText = generatedText.length > 280 
      ? generatedText.substring(0, 277) + '...'
      : generatedText.trim();

    if (!tweetText) {
      throw new Error('Generated tweet text is empty');
    }

    return tweetText;
  } catch (error) {
    throw new Error(
      `Failed to generate tweet text: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
