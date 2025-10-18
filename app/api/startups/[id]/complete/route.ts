import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';

/**
 * POST /api/startups/[id]/complete - Mark startup generation as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: startupId } = await params;
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

    metadata.generationCompleted = true;
    metadata.completedAt = new Date().toISOString();

    // Write back to file
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Generation marked as complete'
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
