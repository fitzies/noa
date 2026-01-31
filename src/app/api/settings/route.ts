import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_PATH = join(process.cwd(), 'data', 'bot-settings.json');

/**
 * GET handler - Returns current bot settings
 */
export async function GET() {
  try {
    const settingsData = readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(settingsData);
    return NextResponse.json(settings);
  } catch (error) {
    // Return defaults if file doesn't exist
    const defaults = {
      postFrequency: 30,
      tone: 'casual',
      personality: '',
    };
    return NextResponse.json(defaults);
  }
}

/**
 * POST handler - Updates bot settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate settings structure
    const settings = {
      postFrequency: typeof body.postFrequency === 'number' ? body.postFrequency : 30,
      tone: typeof body.tone === 'string' ? body.tone : 'casual',
      personality: typeof body.personality === 'string' ? body.personality : '',
    };

    // Validate postFrequency range
    if (settings.postFrequency < 5 || settings.postFrequency > 120) {
      return NextResponse.json(
        { error: 'postFrequency must be between 5 and 120' },
        { status: 400 }
      );
    }

    // Validate tone
    const validTones = ['casual', 'professional', 'witty', 'friendly', 'formal'];
    if (!validTones.includes(settings.tone)) {
      return NextResponse.json(
        { error: `tone must be one of: ${validTones.join(', ')}` },
        { status: 400 }
      );
    }

    // Write settings to file
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
