import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';

/**
 * POST /api/projects/[id]/complete - Mark project generation as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const projectPath = path.join(config.PROJECTS_DIR, projectId);
    const metadataFile = path.join(projectPath, 'project.json');

    try {
      await fs.access(metadataFile);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
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
