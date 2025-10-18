import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { config } from '@/lib/config';
import { StartupAnalyticsManager, FeedbackRating } from '@/lib/analytics';
import { StartupMetadataManager } from '@/lib/startup-metadata';
import { emitLiveFeedback } from '@/lib/feedback-events';

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
    const { deploymentUrl, ratings, comment } = body ?? {};

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one rating is required' },
        { status: 400, headers: corsHeaders }
      );
    }

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

    const questions = metadata.analyticsConfig?.questions || [];

    const normalizedRatings: FeedbackRating[] = ratings
      .map((rating: { questionId?: string; value?: number }) => {
        if (!rating || typeof rating.questionId !== 'string' || typeof rating.value !== 'number') {
          return null;
        }
        const question = questions.find((q) => q.id === rating.questionId);
        return {
          questionId: rating.questionId,
          question: question?.prompt || rating.questionId,
          value: rating.value
        } satisfies FeedbackRating;
      })
      .filter((entry): entry is FeedbackRating => entry !== null);

    if (normalizedRatings.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ratings payload is invalid' },
        { status: 400, headers: corsHeaders }
      );
    }

    const analyticsManager = new StartupAnalyticsManager(startupId);
    const entry = await analyticsManager.recordFeedback(
      resolvedDeploymentUrl,
      normalizedRatings,
      typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : undefined
    );

    emitLiveFeedback({
      startupId,
      deploymentUrl: resolvedDeploymentUrl,
      timestamp: entry.timestamp,
      ratings: normalizedRatings,
      comment: entry.comment
    });

    return NextResponse.json(
      {
        success: true,
        entry
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
