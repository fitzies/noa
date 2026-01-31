import { Client, OAuth1, type OAuth1Config, type ClientConfig } from '@xdevplatform/xdk';
import { generateTweetText } from './gpt';

/**
 * Creates and returns an authenticated X API client using OAuth 1.0a credentials
 * from environment variables.
 * 
 * @returns Configured X API Client instance
 * @throws Error if required environment variables are missing
 */
export function createXClient(): Client {
  const consumerKey = process.env.CONSUMER_KEY;
  const consumerKeySecret = process.env.CONSUMER_KEY_SECRET;
  const accessToken = process.env.ACCESS_TOKEN;
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerKeySecret || !accessToken || !accessTokenSecret) {
    throw new Error('Missing required X API credentials in environment variables');
  }

  const oauth1Config: OAuth1Config = {
    apiKey: consumerKey,
    apiSecret: consumerKeySecret,
    callback: 'oob', // "oob" (out-of-band) for applications with existing tokens
    accessToken: accessToken,
    accessTokenSecret: accessTokenSecret,
  };

  const oauth1: OAuth1 = new OAuth1(oauth1Config);
  const config: ClientConfig = {
    oauth1: oauth1,
  };

  return new Client(config);
}

/**
 * Posts a tweet to X using the authenticated client.
 * 
 * @param content - The text content of the tweet (max 280 characters)
 * @returns Promise resolving to the created post response
 * @throws Error if posting fails
 */
export async function postTweet(content: string) {
  if (!content || content.trim().length === 0) {
    throw new Error('Tweet content cannot be empty');
  }

  if (content.length > 280) {
    throw new Error('Tweet content exceeds 280 character limit');
  }

  const client = createXClient();
  
  try {
    const response = await client.posts.create({
      text: content,
    });
    
    return response;
  } catch (error: any) {
    // Extract more detailed error information
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Try to extract additional error details from the error object
    if (error?.response) {
      errorDetails = `Response status: ${error.response.status}, statusText: ${error.response.statusText}`;
      if (error.response.data) {
        try {
          const errorData = typeof error.response.data === 'string' 
            ? error.response.data 
            : JSON.stringify(error.response.data);
          errorDetails += `, data: ${errorData}`;
        } catch {
          errorDetails += ', data: [unable to parse]';
        }
      }
    } else if (error?.status) {
      errorDetails = `Status: ${error.status}`;
    }
    
    const fullError = errorDetails 
      ? `Failed to post tweet: ${errorMessage}. ${errorDetails}`
      : `Failed to post tweet: ${errorMessage}`;
    
    console.error('Twitter API error details:', {
      message: errorMessage,
      details: errorDetails,
      error: error,
    });
    
    throw new Error(fullError);
  }
}

/**
 * Generates tweet text from news data using GPT and posts it to X.
 * 
 * @param newsData - News data object (flexible structure)
 * @returns Promise resolving to the created post response
 * @throws Error if generation or posting fails
 */
export async function generateAndPostTweet(newsData: any) {
  const tweetText = await generateTweetText(newsData);
  return await postTweet(tweetText);
}
