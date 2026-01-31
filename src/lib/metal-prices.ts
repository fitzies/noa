import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const api = require('metalpriceapi');

export interface MetalPricesCache {
  lastUpdated: string | null;
  prices: {
    XAU: number | null;
    XAG: number | null;
  };
  base: string;
}

const CACHE_PATH = join(process.cwd(), 'data', 'metal-prices.json');

const DEFAULT_CACHE: MetalPricesCache = {
  lastUpdated: null,
  prices: {
    XAU: null,
    XAG: null,
  },
  base: 'USD',
};

/**
 * Fetches live metal prices from Metal Price API
 * @returns Promise resolving to metal prices data
 */
export async function fetchMetalPrices(): Promise<MetalPricesCache> {
  const apiKey = process.env.METAL_PRICE_API;
  
  if (!apiKey) {
    throw new Error('METAL_PRICE_API environment variable is not set');
  }

  api.setAPIKey(apiKey);
  
  try {
    const result = await api.fetchLive('USD', ['XAU', 'XAG']);
    
    // Handle different possible response structures
    // The API might return data directly, in .data property, or in .data.rates
    let rates = null;
    
    // Check for .data.rates (Axios-style response)
    if (result?.data?.rates) {
      rates = result.data.rates;
    } 
    // Check for .data directly containing rates
    else if (result?.data && typeof result.data === 'object') {
      rates = result.data;
    }
    // Check for .rates directly
    else if (result?.rates) {
      rates = result.rates;
    }
    // Check if result itself contains the rates
    else if (result && typeof result === 'object' && (result.XAU || result.XAG || result.xau || result.xag)) {
      rates = result;
    }
    
    if (!rates) {
      // Safe logging without circular references
      const safeResult = {
        hasData: !!result?.data,
        hasRates: !!result?.rates,
        keys: result && typeof result === 'object' ? Object.keys(result).slice(0, 10) : [],
        type: typeof result,
      };
      throw new Error(`Invalid API response structure. Response info: ${JSON.stringify(safeResult)}`);
    }

    const prices: MetalPricesCache = {
      lastUpdated: new Date().toISOString(),
      prices: {
        XAU: rates.XAU || rates.xau || null,
        XAG: rates.XAG || rates.xag || null,
      },
      base: 'USD',
    };

    return prices;
  } catch (error) {
    console.error('Error fetching metal prices:', error);
    throw error;
  }
}

/**
 * Reads cached metal prices from file
 * @returns Metal prices cache object
 */
export function readMetalPricesCache(): MetalPricesCache {
  try {
    if (!existsSync(CACHE_PATH)) {
      return DEFAULT_CACHE;
    }
    
    const cacheData = readFileSync(CACHE_PATH, 'utf-8');
    const cache = JSON.parse(cacheData);
    
    // Validate cache structure
    return {
      lastUpdated: cache.lastUpdated || null,
      prices: {
        XAU: cache.prices?.XAU ?? null,
        XAG: cache.prices?.XAG ?? null,
      },
      base: cache.base || 'USD',
    };
  } catch (error) {
    console.error('Error reading metal prices cache:', error);
    return DEFAULT_CACHE;
  }
}

/**
 * Writes metal prices to cache file
 * @param prices - Metal prices cache object to write
 */
export function writeMetalPricesCache(prices: MetalPricesCache): void {
  try {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    writeFileSync(CACHE_PATH, JSON.stringify(prices, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing metal prices cache:', error);
    throw error;
  }
}
