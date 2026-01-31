import { NextResponse } from 'next/server';
import { readMetalPricesCache } from '@/lib/metal-prices';

/**
 * GET handler - Returns cached metal prices
 */
export async function GET() {
  try {
    const cache = readMetalPricesCache();
    return NextResponse.json(cache);
  } catch (error) {
    console.error('Error reading metal prices:', error);
    return NextResponse.json(
      {
        error: 'Failed to read metal prices cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
