import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { config } from '@/lib/config';
import { StartupAnalyticsManager } from '@/lib/analytics';
import { StartupMetadataManager } from '@/lib/startup-metadata';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: startupId } = await params;
    const body = await request.json();
    const { deploymentUrl } = body ?? {};

    const startupPath = path.join(config.STARTUPS_DIR, startupId);
    const metadataManager = new StartupMetadataManager(startupPath);
    const metadata = await metadataManager.read();

    if (!metadata) {
      return NextResponse.json(
        { success: false, message: 'Startup not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const resolvedDeploymentUrl =
      typeof deploymentUrl === 'string' && deploymentUrl.length > 0
        ? deploymentUrl
        : metadata.deploymentUrl || metadata.analyticsConfig?.latestDeploymentUrl;

    if (!resolvedDeploymentUrl) {
      return NextResponse.json(
        { success: false, message: 'Deployment URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const analyticsManager = new StartupAnalyticsManager(startupId);
    const event = await analyticsManager.recordVisit(resolvedDeploymentUrl);

    return NextResponse.json(
      {
        success: true,
        event
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
