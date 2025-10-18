import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/lib/config';

/**
 * GET /api/startups - List all startups
 */
export async function GET() {
  try {
    const startups = [];
    const startupsDir = config.STARTUPS_DIR;

    // Ensure startups directory exists
    await fs.mkdir(startupsDir, { recursive: true });

    const dirs = await fs.readdir(startupsDir);

    for (const dir of dirs) {
      const startupPath = path.join(startupsDir, dir);
      const stats = await fs.stat(startupPath);

      if (stats.isDirectory()) {
        const metadataFile = path.join(startupPath, 'startup.json');

        try {
          const metadataContent = await fs.readFile(metadataFile, 'utf-8');
          const metadata = JSON.parse(metadataContent);
          startups.push(metadata);
        } catch {
          // Skip startups without metadata
          continue;
        }
      }
    }

    // Sort by created_at descending
    startups.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      success: true,
      startups
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
 * POST /api/startups - Create a new startup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, name, template = 'blank' } = body;

    const baseUrl = config.PUBLIC_BASE_URL;

    // Generate unique startup ID
    const startupId = uuidv4();

    // Create startup directory
    const startupPath = path.join(config.STARTUPS_DIR, startupId);
    await fs.mkdir(startupPath, { recursive: true });

    // Store startup metadata
    const metadata = {
      id: startupId,
      startupId,
      name: name || `startup-${startupId.substring(0, 8)}`,
      startupName: name || `startup-${startupId.substring(0, 8)}`,
      prompt,
      template,
      created_at: new Date().toISOString(),
      path: startupPath,
      generationCompleted: false,
      messages: [],
      latestDashboardUrl: `${baseUrl}/dashboard/${startupId}`,
      analyticsConfig: {
        startupId,
        baseUrl,
        visitEndpoint: `${baseUrl}/api/startups/${startupId}/analytics/visit`,
        feedbackEndpoint: `${baseUrl}/api/startups/${startupId}/analytics/feedback`,
        dashboardUrl: `${baseUrl}/dashboard/${startupId}`,
        questions: [
          {
            id: 'ui_quality',
            prompt: 'Rate the visual design and polish (1-5).',
            scaleMin: 1,
            scaleMax: 5
          },
          {
            id: 'feature_usefulness',
            prompt: 'Rate how useful the core features are (1-5).',
            scaleMin: 1,
            scaleMax: 5
          }
        ]
      }
    };

    const metadataFile = path.join(startupPath, 'startup.json');
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      startup_id: startupId,
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
