import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { config } from '@/lib/config';
import { StartupAnalyticsManager } from '@/lib/analytics';
import { StartupMetadataManager } from '@/lib/startup-metadata';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: startupId } = await params;

    const startupPath = path.join(config.STARTUPS_DIR, startupId);
    const metadataManager = new StartupMetadataManager(startupPath);
    const metadata = await metadataManager.read();

    if (!metadata) {
      return NextResponse.json(
        { success: false, message: 'Startup not found' },
        { status: 404 }
      );
    }

    const analyticsManager = new StartupAnalyticsManager(startupId);
    const dashboardData = await analyticsManager.getDashboardData();

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        latestDeploymentUrl: metadata.deploymentUrl || dashboardData.latestDeploymentUrl || null
      }
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
