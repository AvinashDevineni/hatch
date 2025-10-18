import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/lib/config';

/**
 * GET /api/projects - List all projects
 */
export async function GET() {
  try {
    const projects = [];
    const projectsDir = config.PROJECTS_DIR;

    // Ensure projects directory exists
    await fs.mkdir(projectsDir, { recursive: true });

    const dirs = await fs.readdir(projectsDir);

    for (const dir of dirs) {
      const projectPath = path.join(projectsDir, dir);
      const stats = await fs.stat(projectPath);

      if (stats.isDirectory()) {
        const metadataFile = path.join(projectPath, 'project.json');

        try {
          const metadataContent = await fs.readFile(metadataFile, 'utf-8');
          const metadata = JSON.parse(metadataContent);
          projects.push(metadata);
        } catch (error) {
          // Skip projects without metadata
          continue;
        }
      }
    }

    // Sort by created_at descending
    projects.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      success: true,
      projects
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
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, name, template = 'blank' } = body;

    // Generate unique project ID
    const projectId = uuidv4();

    // Create project directory
    const projectPath = path.join(config.PROJECTS_DIR, projectId);
    await fs.mkdir(projectPath, { recursive: true });

    // Store project metadata
    const metadata = {
      id: projectId,
      name: name || `project-${projectId.substring(0, 8)}`,
      prompt,
      template,
      created_at: new Date().toISOString(),
      path: projectPath,
      generationCompleted: false,
      messages: []
    };

    const metadataFile = path.join(projectPath, 'project.json');
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      project_id: projectId,
      metadata
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
