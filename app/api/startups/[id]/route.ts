import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';
import { CodeGeneratorTools } from '@/lib/agent-tools';

/**
 * GET /api/startups/[id] - Get startup details
 */
export async function GET(
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

    // Get file structure
    const tools = new CodeGeneratorTools(startupPath);
    const structure = tools.getStartupStructure();
    const fileList = await tools.listFiles();

    return NextResponse.json({
      success: true,
      metadata,
      structure,
      files: fileList.files || []
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

/**
 * DELETE /api/startups/[id] - Delete a startup
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: startupId } = await params;
    const startupPath = path.join(config.STARTUPS_DIR, startupId);

    try {
      await fs.access(startupPath);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Startup not found' },
        { status: 404 }
      );
    }

    // Delete startup directory recursively
    await fs.rm(startupPath, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: `Startup ${startupId} deleted`
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
