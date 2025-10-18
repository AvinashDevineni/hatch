import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';
import { CodeGeneratorTools } from '@/lib/agent-tools';

/**
 * GET /api/projects/[id] - Get project details
 */
export async function GET(
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

    // Get file structure
    const tools = new CodeGeneratorTools(projectPath);
    const structure = tools.getProjectStructure();
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
 * DELETE /api/projects/[id] - Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const projectPath = path.join(config.PROJECTS_DIR, projectId);

    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project directory recursively
    await fs.rm(projectPath, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: `Project ${projectId} deleted`
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
