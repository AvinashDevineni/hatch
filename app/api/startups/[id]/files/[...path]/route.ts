import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { config } from '@/lib/config';
import { CodeGeneratorTools } from '@/lib/agent-tools';

/**
 * GET /api/startups/[id]/files/[...path] - Get file content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id: startupId, path: filePath } = await params;
    const startupPath = path.join(config.STARTUPS_DIR, startupId);
    const tools = new CodeGeneratorTools(startupPath);

    const filePathStr = filePath.join('/');
    const result = await tools.readFile(filePathStr);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      path: filePathStr
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
