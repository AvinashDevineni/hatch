import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';

/**
 * POST /api/startups/[id]/messages - Save messages array to startup metadata
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: startupId } = await params;
    const body = await request.json();
    const { messages } = body;

    const startupPath = path.join(config.STARTUPS_DIR, startupId);
    const metadataFile = path.join(startupPath, 'startup.json');

    try {
      await fs.access(metadataFile);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Startup not found' },
        { status: 404 }
      );
    }

    const metadataContent = await fs.readFile(metadataFile, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Replace the entire messages array
    metadata.messages = messages || [];

    // Write back to file
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Messages saved'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
